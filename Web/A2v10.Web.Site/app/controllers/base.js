﻿// Copyright © 2015-2018 Alex Kukhtin. All rights reserved.

// 20180226-7120
// controllers/base.js

(function () {

	const eventBus = require('std:eventBus');
	const utils = require('std:utils');
	const dataservice = require('std:dataservice');
	const urltools = require('std:url');
	const log = require('std:log');
	const locale = window.$$locale;

	const store = component('std:store');
	const documentTitle = component("std:doctitle");

	let __updateStartTime = 0;
	let __createStartTime = 0;

	function __runDialog(url, arg, query, cb) {
		return new Promise(function (resolve, reject) {
			const dlgData = { promise: null, data: arg, query: query };
			eventBus.$emit('modal', url, dlgData);
			dlgData.promise.then(function (result) {
				cb(result);
				resolve(result);
			});
		});
	}

	function getPagerInfo(mi) {
		if (!mi) return undefined;
		let x = { PageSize: mi.PageSize, Offset: mi.Offset, Dir: mi.SortDir, Order: mi.SortOrder };
		if (mi.Filter)
			for (let p in mi.Filter)
				x[p] = mi.Filter[p];
		return x;
	}

	const base = Vue.extend({
		// inDialog: Boolean (in derived class)
		// pageTitle: String (in derived class)
		store: store,
		components: {
			'a2-document-title': documentTitle
		},
		data() {
			return {
				__init__: true,
				__baseUrl__: '',
				__baseQuery__: {},
				__requestsCount__: 0
			};
		},

		computed: {
			$baseUrl() {
				return this.$data.__baseUrl__;
			},
			$baseQuery() {
				return this.$data.__baseQuery__;
			},
			$indirectUrl() {
				return this.$data.__modelInfo.__indirectUrl__ || '';
			},
			$query() {
				return this.$data._query_;
			},
			$isDirty() {
				return this.$data.$dirty;
			},
			$isPristine() {
				return !this.$data.$dirty;
			},
			$isLoading() {
				return this.$data.__requestsCount__ > 0;
			},
			$modelInfo() {
				return this.$data.__modelInfo;
			},
			$canSave() {
				return this.$isDirty && !this.$isLoading;
			}
		},
		methods: {
			$marker() {
				return true;
			},
			$exec(cmd, arg, confirm, opts) {
				if (this.$isReadOnly(opts)) return;
				const root = this.$data;
				root._exec_(cmd, arg, confirm, opts);
				return;
                /*
                const doExec = () => {
                    let root = this.$data;
                    if (!confirm)
                        root._exec_(cmd, arg, confirm, opts);
                    else
                        this.$confirm(confirm).then(() => root._exec_(cmd, arg));
                }

                if (opts && opts.saveRequired && this.$isDirty) {
                    this.$save().then(() => doExec());
                } else {
                    doExec();
                }
                */
			},

			$isReadOnly(opts) {
				return opts && opts.checkReadOnly && this.$data.$readOnly;
			},

			$execSelected(cmd, arg, confirm) {
				let root = this.$data;
				if (!utils.isArray(arg)) {
					console.error('Invalid argument for $execSelected');
					return;
				}
				if (!confirm)
					root._exec_(cmd, arg.$selected);
				else
					this.$confirm(confirm).then(() => root._exec_(cmd, arg.$selected));
			},
			$canExecute(cmd, arg, opts) {
				if (this.$isReadOnly(opts))
					return false;
				let root = this.$data;
				return root._canExec_(cmd, arg, opts);
			},
			$save() {
				if (this.$data.$readOnly)
					return;
				let self = this;
				let root = window.$$rootUrl;
				let url = root + '/_data/save';
				let urlToSave = this.$indirectUrl || this.$baseUrl;
				return new Promise(function (resolve, reject) {
					let jsonData = utils.toJson({ baseUrl: urlToSave, data: self.$data });
					let wasNew = self.$baseUrl.endsWith('/new');
					dataservice.post(url, jsonData).then(function (data) {
						self.$data.$merge(data);
						self.$data.$setDirty(false);
						// data is a full model. Resolve requires only single element.
						let dataToResolve;
						let newId;
						for (let p in data) {
							// always first element in the result
							dataToResolve = data[p];
							newId = self.$data[p].$id; // new element
							if (dataToResolve)
								break;
						}
						if (wasNew && newId) {
							// assign the new id to the route
							self.$store.commit('setnewid', { id: newId });
							// and in the __baseUrl__
							self.$data.__baseUrl__ = self.$data.__baseUrl__.replace('/new', '/' + newId);
						}
						resolve(dataToResolve); // single element (raw data)
					}).catch(function (msg) {
						self.$alertUi(msg);
					});
				});
			},

			$invoke(cmd, data, base) {
				let self = this;
				let root = window.$$rootUrl;
				let url = root + '/_data/invoke';
				let baseUrl = self.$indirectUrl || self.$baseUrl;
				if (base)
					baseUrl = urltools.combine('_page', base, 'index', 0);
				return new Promise(function (resolve, reject) {
					var jsonData = utils.toJson({ cmd: cmd, baseUrl: baseUrl, data: data });
					dataservice.post(url, jsonData).then(function (data) {
						if (utils.isObject(data)) {
							resolve(data);
						} else {
							throw new Error('Invalid response type for $invoke');
						}
					}).catch(function (msg) {
						self.$alertUi(msg);
					});
				});
			},

			$asyncValid(cmd, data) {
				const vm = this;
				const cache = vm.__asyncCache__;
				const djson = JSON.stringify(data);
				let val = cache[cmd];
				if (!val) {
					val = { data: '', result: null };
					cache[cmd] = val;
				}
				if (val.data === djson) {
					return val.result;
				}
				val.data = djson;
				return new Promise(function (resolve, reject) {
					Vue.nextTick(() => {
						vm.$invoke(cmd, data).then((result) => {
							val.result = result.Result.Value;
							resolve(val.result);
						});
					});
				});
			},

			$reload(args) {
				//console.dir('$reload was called for' + this.$baseUrl);
				let self = this;
				if (utils.isArray(args) && args.$isLazy()) {
					// reload lazy
					let propIx = args._path_.lastIndexOf('.');
					let prop = args._path_.substring(propIx + 1);
					args.$loaded = false; // reload
					return self.$loadLazy(args.$parent, prop);
				}
				let root = window.$$rootUrl;
				let url = root + '/_data/reload';
				let dat = self.$data;
				let mi = args ? getPagerInfo(args.$ModelInfo) : null;
				return new Promise(function (resolve, reject) {
					let dataToQuery = { baseUrl: urltools.replaceUrlQuery(self.$baseUrl, mi) };
					if (utils.isDefined(dat.Query)) {
						// special element -> use url
						dataToQuery.baseUrl = urltools.replaceUrlQuery(self.$baseUrl, dat.Query);
						let newUrl = urltools.replaceUrlQuery(null/*current*/, dat.Query);
						window.history.replaceState(null, null, newUrl);
					}
					let jsonData = utils.toJson(dataToQuery);
					dataservice.post(url, jsonData).then(function (data) {
						if (utils.isObject(data)) {
							dat.$merge(data);
							dat._setModelInfo_(undefined, data);
							dat._fireLoad_();
						} else {
							throw new Error('Invalid response type for $reload');
						}
					}).catch(function (msg) {
						self.$alertUi(msg);
					});
				});
			},

			$requery() {
				if (this.inDialog)
					alert('$requery command is not supported in dialogs');
				else
					eventBus.$emit('requery');
			},

			$remove(item, confirm) {
				if (this.$data.$readOnly)
					return;
				if (!confirm)
					item.$remove();
				else
					this.$confirm(confirm).then(() => item.$remove());
			},

			$removeSelected(arr, confirm) {
				if (!utils.isArray(arr)) {
					console.error('$removeSelected. The argument is not an array');
				}
				if (this.$data.$readOnly)
					return;
				let item = arr.$selected;
				if (!item)
					return;
				this.$remove(item, confirm);
			},

			$href(url, data) {
				let dataToHref = data;
				if (utils.isObjectExact(dataToHref))
					dataToHref = dataToHref.$id;
				let retUrl = urltools.combine(url, dataToHref);
				return retUrl;
			},
			$navigate(url, data, newWindow) {
				let urlToNavigate = urltools.createUrlForNavigate(url, data);
				if (newWindow === true) {
					window.open(urlToNavigate, "_blank");
				}
				else
					this.$store.commit('navigate', { url: urlToNavigate });
			},

			$replaceId(newId) {
				this.$store.commit('setnewid', { id: newId });
				// and in the __baseUrl__
				//urlTools.replace()
				this.$data.__baseUrl__ = self.$data.__baseUrl__.replace('/new', '/' + newId);
			},

			$dbRemove(elem, confirm) {
				if (!elem)
					return;
				let id = elem.$id;
				let root = window.$$rootUrl;
				const self = this;
				function dbRemove() {
					let postUrl = root + '/_data/dbRemove';
					let jsonData = utils.toJson({ baseUrl: self.$baseUrl, id: id });
					dataservice.post(postUrl, jsonData).then(function (data) {
						elem.$remove(); // without confirm
					}).catch(function (msg) {
						self.$alertUi(msg);
					});
				}
				if (confirm) {
					this.$confirm(confirm).then(function () {
						dbRemove();
					});
				} else {
					dbRemove();
				}
			},

			$dbRemoveSelected(arr, confirm) {
				let sel = arr.$selected;
				if (!sel)
					return;
				this.$dbRemove(sel, confirm);
			},

			$openSelected(url, arr) {
				url = url || '';
				let sel = arr.$selected;
				if (!sel)
					return;
				if (url.startsWith('{')) { // decorated. defer evaluate
					url = url.substring(1, url.length - 1);
					let nUrl = utils.eval(sel, url);
					if (!nUrl)
						throw new Error(`Property '${url}' not found in ${sel.constructor.name} object`);
					url = nUrl;
				}
				this.$navigate(url, sel.$id);
			},

			$hasSelected(arr) {
				return arr && !!arr.$selected;
			},

			$hasChecked(arr) {
				return arr && arr.$checked && arr.$checked.length;
			},

			$confirm(prms) {
				if (utils.isString(prms))
					prms = { message: prms };
				prms.style = 'confirm';
				prms.message = prms.message || prms.msg; // message or msg
				let dlgData = { promise: null, data: prms };
				eventBus.$emit('confirm', dlgData);
				return dlgData.promise;
			},

			$alert(msg, title) {
				let dlgData = {
					promise: null, data: {
						message: msg, title: title, style: 'alert'
					}
				};
				eventBus.$emit('confirm', dlgData);
				return dlgData.promise;
			},

			$alertUi(msg) {
				if (msg instanceof Error) {
					alert(msg.message);
					return;
				}
				if (msg.indexOf('UI:') === 0)
					this.$alert(msg.substring(3).replace('\\n', '\n'));

				else
					alert(msg);
			},

			$showDialog(url, arg, query, opts) {
				return this.$dialog('show', url, arg, query, opts);
			},


			$dialog(command, url, arg, query, opts) {
				if (this.$isReadOnly(opts))
					return;
				function argIsNotAnArray() {
					if (!utils.isArray(arg)) {
						console.error(`$dialog.${command}. The argument is not an array`);
						return true;
					}
				}
				function argIsNotAnObject() {
					if (!utils.isObjectExact(arg)) {
						console.error(`$dialog.${command}. The argument is not an object`);
						return true;
					}
				}
				function doDialog() {
					// result always is raw data
					switch (command) {
						case 'append':
							if (argIsNotAnArray()) return;
							return __runDialog(url, 0, query, (result) => { arg.$append(result); });
						case 'browse':
							if (!utils.isObject(arg)) {
								console.error(`$dialog.${command}. The argument is not an object`);
								return;
							}
							return __runDialog(url, arg, query, (result) => { arg.$merge(result, true /*fire*/); });
						case 'edit-selected':
							if (argIsNotAnArray()) return;
							return __runDialog(url, arg.$selected, query, (result) => { arg.$selected.$merge(result, false /*fire*/); });
						case 'edit':
							if (argIsNotAnObject()) return;
							return __runDialog(url, arg, query, (result) => { arg.$merge(result, false /*fire*/); });
						default: // simple show dialog
							return __runDialog(url, arg, query, () => { });
					}
				}

				if (opts && opts.validRequired && root.$invalid) {
					this.$alert(locale.$MakeValidFirst);
					return;
				}

				if (opts && opts.saveRequired && this.$isDirty) {
					let dlgResult = null;
					this.$save().then(() => { dlgResult = doDialog(); });
					return dlgResult;
				}
				return doDialog();
			},

			$report(rep, arg, opts) {
				if (this.$isReadOnly(opts)) return;
				doReport = () => {
					let id = arg;
					if (arg && utils.isObject(arg))
						id = arg.$id;
					const root = window.$$rootUrl;
					let url = root + '/report/show/' + id;
					let reportUrl = this.$indirectUrl || this.$baseUrl;
					let baseUrl = urltools.makeBaseUrl(reportUrl);
					url = url + urltools.makeQueryString({ base: baseUrl, rep: rep });
					// open in new window
					window.open(url, "_blank");
				};

				if (opts && opts.validRequired && root.$invalid) {
					this.$alert(locale.$MakeValidFirst);
					return;
				}

				if (opts && opts.saveRequired && this.$isDirty) {
					this.$save().then(() => doReport());
				} else {
					doReport();
				}
			},

			$modalSaveAndClose(result, opts) {
				if (this.$isDirty) {
					const root = this.$data;
					if (opts && opts.validRequired && root.$invalid) {
						this.$alert(locale.$MakeValidFirst);
						return;
					}
					this.$save().then((result) => eventBus.$emit('modalClose', result));
				}
				else
					eventBus.$emit('modalClose', result);
			},

			$modalClose(result) {
				eventBus.$emit('modalClose', result);
			},

			$modalSelect(array) {
				if (!('$selected' in array)) {
					console.error('invalid array for $modalSelect');
					return;
				}
				this.$modalClose(array.$selected);
			},

			$modalSelectChecked(array) {
				if (!('$checked' in array)) {
					console.error('invalid array for $modalSelectChecked');
					return;
				}
				let chArray = array.$checked;
				if (chArray.length > 0)
					this.$modalClose(chArray);
			},

			$saveAndClose() {
				if (this.$isDirty)
					this.$save().then(() => this.$close());
				else
					this.$close();
			},

			$close() {
				if (this.$saveModified())
					this.$store.commit("close");
			},

			$showHelp(path) {
				window.open(this.$helpHref(path), "_blank");
			},

			$helpHref(path) {
				let helpUrlElem = document.querySelector('meta[name=helpUrl]');
				if (!helpUrlElem || !helpUrlElem.content)
					console.error('help url is not specified');
				return helpUrlElem.content + path;
			},

			$searchChange() {
				let newUrl = this.$store.replaceUrlSearch(this.$baseUrl);
				this.$data.__baseUrl__ = newUrl;
				this.$reload();
			},

			$saveModified() {
				if (!this.$isDirty)
					return true;
				let self = this;
				let dlg = {
					message: locale.$ElementWasChanged,
					title: locale.$ConfirmClose,
					buttons: [
						{ text: locale.$Save, result: "save" },
						{ text: locale.$NotSave, result: "close" },
						{ text: locale.$Cancel, result: false }
					]
				};
				this.$confirm(dlg).then(function (result) {
					if (result === 'close') {
						// close without saving
						self.$data.$setDirty(false);
						self.$close();
					} else if (result === 'save') {
						// save then close
						self.$save().then(function () {
							self.$close();
						});
					}
				});
				return false;
			},

			$format(value, dataType, format, options) {
				if (!format && !dataType)
					return value;
				if (dataType)
					value = utils.format(value, dataType, options && options.hideZeros);
				if (format && format.indexOf('{0}') !== -1)
					return format.replace('{0}', value);
				return value;
			},

			$expand(elem, propName) {
				let arr = elem[propName];
				if (arr.$loaded)
					return;
				if (!utils.isDefined(elem.$hasChildren))
					return; // no $hasChildren property - static expand
				let self = this,
					root = window.$$rootUrl,
					url = root + '/_data/expand',
					jsonData = utils.toJson({ baseUrl: self.$baseUrl, id: elem.$id });

				dataservice.post(url, jsonData).then(function (data) {
					let srcArray = data[propName];
					arr.$empty();
					for (let el of srcArray)
						arr.push(arr.$new(el));
				}).catch(function (msg) {
					self.$alertUi(msg);
				});

				arr.$loaded = true;
			},

			$loadLazy(elem, propName) {
				let self = this,
					mi = getPagerInfo(elem[propName].$ModelInfo),
					root = window.$$rootUrl,
					url = root + '/_data/loadlazy',
					jsonData = utils.toJson({ baseUrl: urltools.replaceUrlQuery(self.$baseUrl, mi), id: elem.$id, prop: propName });

				return new Promise(function (resolve, reject) {
					let arr = elem[propName];
					if (arr.$loaded) {
						resolve(arr);
						return;
					}
					dataservice.post(url, jsonData).then(function (data) {
						if (propName in data) {
							arr.$empty();
							for (let el of data[propName])
								arr.push(arr.$new(el));
							let rcName = propName + '.$RowCount';
							if (rcName in data) {
								arr.$RowCount = data[rcName];
							}
							arr._root_._setModelInfo_(arr, data);
						}
						resolve(arr);
					}).catch(function (msg) {
						self.$alertUi(msg);
					});
					arr.$loaded = true;
				});
			},

			$delegate(name) {
				const root = this.$data;
				return root._delegate_(name);
			},

			__beginRequest() {
				this.$data.__requestsCount__ += 1;
			},
			__endRequest() {
				this.$data.__requestsCount__ -= 1;
			},
			__cwChange(source) {
				this.$reload(source);
			},
			__queryChange(search, source) {
				// preserve $baseQuery (without data from search)
				if (!utils.isObjectExact(search)) {
					console.error('base.__queryChange. invalid argument type');
				}
				let nq = Object.assign({}, this.$baseQuery);
				for (let p in search) {
					if (search[p]) {
						// replace from search
						nq[p] = search[p];
					}
					else {
						// undefined element, delete from query
						delete nq[p];
					}
				}
				this.$data.__baseUrl__ = this.$store.replaceUrlSearch(this.$baseUrl, urltools.makeQueryString(nq));
				this.$reload(source);
			},
			__doInit__() {
				const root = this.$data;
				if (!root._modelLoad_) return;
				let caller = null;
				if (this.$caller)
					caller = this.$caller.$data;
				root._modelLoad_(caller);
			}
		},
		created() {
			let out = { caller: null };
			eventBus.$emit('registerData', this, out);
			this.$caller = out.caller;

			eventBus.$on('beginRequest', this.__beginRequest);
			eventBus.$on('endRequest', this.__endRequest);
			eventBus.$on('queryChange', this.__queryChange);

			this.$on('localQueryChange', this.__queryChange);
			this.$on('cwChange', this.__cwChange);
			this.__asyncCache__ = {};
			log.time('create time:', __createStartTime, false);
		},
		beforeDestroy() {
		},
		destroyed() {
			//console.dir('base.js has been destroyed');
			eventBus.$emit('registerData', null);
			eventBus.$off('beginRequest', this.__beginRequest);
			eventBus.$off('endRequest', this.__endRequest);
			eventBus.$off('queryChange', this.__queryChange);
			this.$off('localQueryChange', this.__queryChange);
			this.$off('cwChange', this.__cwChange);
		},
		beforeUpdate() {
			__updateStartTime = performance.now();
		},
		beforeCreate() {
			__createStartTime = performance.now();
		},
		updated() {
			log.time('update time:', __updateStartTime, false);
		}
	});

	app.components['baseController'] = base;
})();