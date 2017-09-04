﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace A2v10.Xaml
{
	public abstract class Control : UIElement
	{
        public Boolean Block { get; set; }
        public String Label { get; set; }
        public Boolean Required { get; set; }

        Lazy<UIElementCollection> _addOns = new Lazy<UIElementCollection>();

        public UIElementCollection AddOns { get { return _addOns.Value;} }

        internal override void MergeAttributes(TagBuilder tag, RenderContext context)
        {
            base.MergeAttributes(tag, context);
            if (Block)
                tag.AddCssClass("block");
            AddControlAttributes(tag, context);
        }

        private void AddControlAttributes(TagBuilder tag, RenderContext context)
        {
            MergeBindingAttributeString(tag, context, "label", nameof(Label), Label);
            MergeBoolAttribute(tag, context, nameof(Required), Required);
        }

        internal void RenderAddOns(RenderContext context)
        {
            if (!_addOns.IsValueCreated)
                return;
            foreach (var ctl in AddOns)
            {
                ctl.RenderElement(context, (tag) =>
                {
                    tag.AddCssClass("add-on");
                    tag.MergeAttribute("tabindex", "-1");
                });
            }
        }
    }
}
