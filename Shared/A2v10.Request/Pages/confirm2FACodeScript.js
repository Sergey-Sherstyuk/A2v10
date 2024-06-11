// Copyright © 2015-2021 Alex Kukhtin. All rights reserved.

// 20210619-7785

"use strict";

(function () {


	const token = '$(Token)';

	$(Utils)
	$(Locale)

	const vm = new Vue({
		el: "#app",
		data: {
			userLocale: window.$$locale.$Locale, /*current locale here */
			processing: false,
			info: $(PageData),
			appLinks: $(AppLinks),
			appData: $(AppData),
			submitted: false,
			serverError: '',
			passwordError: '',
			confirmCode: '',
			loginVisible: true,
			againVisible: true,
			loginVisible: true
		},
		computed: {
			hasLogo() {
				return this.appData && this.appData.appLogo;
			},
			logoSrc() {
				return this.appData.appLogo;
			},
			locale: function() {
				return window.$$locale;
			},
			valid: function() {
				if (!this.submitted) return true;
				return !!this.confirmCode;
			},
			confirmCodeDisabled() {
				return !this.confirmCode;
			}
		},
		methods: {
			submitConfirm: function () {
				this.processing = true;
				let dataToSend = {
					Code: this.confirmCode
				};
				const that = this;
				post('/account/confirm2facode', dataToSend)
					.then(function (response) {
						that.processing = false;
						let result = response.Status;
						switch (result) {
							case 'Success':
								that.navigate();
								break;
							case 'Lockout':
								that.setError('$UserLockuotError');
								break;	
							case 'InvalidConfirmCode':
								that.setError('$InvalidConfirmCode');
								break;
							case 'LoggedIn':
								that.navigate();
								break;
							case 'AntiForgery':
								alert(that.locale.$ErrorAntiForgery);
								that.reload();
								break;
							default:
								alert(result);
						}
					})
					.catch(function (error) {
						that.processing = false;
						alert(error);
					});
			},
			sendCode() {
				this.processing = true;
				let dataToSend = {
				};
				const that = this;
				post('/account/send2facode', dataToSend)
					.then(function (response) {
						that.processing = false;
						let result = response.Status;
						switch (result) {
							case 'Success':
								break;
							default:
								alert(result);
						}
					})
					.catch(function (error) {
						that.processing = false;
						alert(`${that.locale.$ErrorText}: ${error}`);
					});
			},
			navigate: function() {
				let qs = parseQueryString(window.location.search);
				let url = qs.ReturnUrl || '/';
				let xp = window.__xparam__;
				if (xp)
					url += xp;
				window.location.assign(url);
			},
			reload: function () {
				window.location.reload();
			},
			setError: function (key) {
				let err = this.locale[key];
				this.serverError = err || key;
			},
			getReferUrl: function (url) {
				return getReferralUrl(url);
			},
			__keyUp(event) {
				if (event.which === 13) {
					this.submitConfirm();
				}
			}
		},
		mounted: function() {
			document.addEventListener('keypress', this.__keyUp);
			this.sendCode();
		}
	});
})();