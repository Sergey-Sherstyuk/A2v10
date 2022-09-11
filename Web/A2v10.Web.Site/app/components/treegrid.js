﻿// Copyright © 2022 Alex Kukhtin. All rights reserved.

// 20220825-7883
// components/treegrid.js

(function () {

	let gridTemplate = `
<table>
	<thead><tr><slot name="header"></slot></tr></thead>
	<tbody>
		<tr v-for="(itm, ix) in rows" :class="rowClass(itm)" 
				@click.stop.prevent="select(itm)" v-on:dblclick.prevent="dblClick($event, itm)">
			<slot name="row" v-bind:itm="itm.elem" v-bind:that="that"></slot>
		</tr>
	</tbody>
</table>
`;

	Vue.component('tree-grid', {
		template: gridTemplate,
		props: {
			root: [Object, Array],
			item: String,
			folderStyle: String,
			doubleclick: Function
		},
		computed: {
			rows() {
				let arr = [];
				let collect = (pa, lev) => {
					for (let i = 0; i < pa.length; i++) {
						let el = pa[i];
						let ch = el[this.item];
						arr.push({ elem: el, level: lev });
						if (ch && el.$expanded)
							collect(ch, lev + 1);
					}
				};
				if (Array.isArray(this.root))
					collect(this.root, 0);
				else
					collect(this.root[this.item], 0);
				return arr;
			},
			that() {
				return this;
			}
		},
		watch: {
			root() {
				console.dir('whatch items');
			}
		},
		methods: {
			toggle(itm) {
				itm.$expanded = !itm.$expanded;
			},
			select(itm) {
				itm.elem.$select(this.root);
			},
			dblClick(evt, itm) {
				evt.stopImmediatePropagation();
				window.getSelection().removeAllRanges();
				if (this.doubleclick)
					this.doubleclick();
			},
			hasChildren(itm) {
				let ch = itm[this.item];
				return ch && ch.length > 0;
			},
			rowClass(itm) {
				let cls = `lev lev-${itm.level}`;
				if (itm.elem.$selected)
					cls += ' active';
				if (this.hasChildren(itm.elem) && this.folderStyle !== 'none')
					cls += ' ' + this.folderStyle;
					
				return cls;
			},
			toggleClass(itm) {
				return itm.$expanded ? 'expanded' : 'collapsed';
			}
		}
	});
})();