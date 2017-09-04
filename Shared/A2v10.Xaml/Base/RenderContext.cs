﻿
using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

namespace A2v10.Xaml
{
    internal struct GridRowCol
    {
        private Int32? _row;
        private Int32? _col;
        private Int32? _rowSpan;
        private Int32? _colSpan;

        public GridRowCol(Int32? row, Int32? col, Int32? rowSpan, Int32? colSpan)
        {
            _row = row;
            _col = col;
            _rowSpan = rowSpan;
            _colSpan = colSpan;
        }

        public IList<StringKeyValuePair> GetGridAttributes()
        {
            var rv = new List<StringKeyValuePair>();
            String row = "1";
            String col = "1";
            if (_row != null && _row.Value != 0)
                row = _row.Value.ToString();
            if (_rowSpan != null && _rowSpan.Value != 0)
                row += " / span " + _rowSpan.Value.ToString();
            rv.Add(new StringKeyValuePair() { Key = "grid-row", Value = row });
            if (_col != null && _col.Value != 0)
                col = _col.Value.ToString();
            if (_colSpan != null && _colSpan.Value != 0)
                col += " / span " + _colSpan.Value.ToString();
            rv.Add(new StringKeyValuePair() { Key = "grid-column", Value = col });
            return rv;
        }
    }

    internal class GridContext : IDisposable
    {
        RenderContext _renderContext;

        public GridContext(RenderContext renderContext, GridRowCol rowCol)
        {
            _renderContext = renderContext;
            _renderContext.PushRowCol(rowCol);
        }

        public void Dispose()
        {
            _renderContext.PopRowCol();
        }
    }



    internal class ScopeContext: IDisposable
    {
        RenderContext _renderContext;
        public ScopeContext(RenderContext context, String scope)
        {
            _renderContext = context;
            _renderContext.PushScope(scope);
        }

        public void Dispose()
        {
            _renderContext.PopScope();
        }
    }

	internal class RenderContext
	{
        public String RootId { get; set; }
		public TextWriter Writer { get; private set; }

        private Stack<GridRowCol> _stackGrid = new Stack<GridRowCol>();
        private Stack<String> _stackScope = new Stack<String>();
        private UIElementBase _root;

        public RenderContext(TextWriter writer, UIElementBase root)
        {
            Writer = writer;
            _root = root;
        }

        public Boolean IsDialog { get
            {
                return _root is Dialog;
            }
        }

        public void RenderSpace()
		{
			Writer.Write(" ");
		}

		public void RenderNbSpace()
		{
			Writer.Write("&#xa;");
		}

        public GridContext GridContext(Int32? row, Int32? col, Int32? rowSpan, Int32? colSpan)
        {
            var rowCol = new GridRowCol(row, col, rowSpan, colSpan);
            return new GridContext(this, rowCol);
        }

        internal void PushRowCol(GridRowCol rowCol)
        {
            _stackGrid.Push(rowCol);
        }

        internal void PopRowCol()
        {
            _stackGrid.Pop();
        }

        internal void PushScope(String scope)
        {
            _stackScope.Push(scope);
        }

        internal void PopScope()
        {
            _stackScope.Pop();
        }

        public IEnumerable<StringKeyValuePair> GetGridAttributes()
        {
            if (_stackGrid.Count == 0)
                return null;
            GridRowCol rowCol = _stackGrid.Peek();
            return rowCol.GetGridAttributes();
        }

        internal String GetNormalizedPath(String path)
        {
            if (_stackScope.Count == 0)
                return path;
            if (path.StartsWith("Parent."))
                return path;
            String scope = _stackScope.Peek();
            return scope + '.' + path;
        }
	}
}
