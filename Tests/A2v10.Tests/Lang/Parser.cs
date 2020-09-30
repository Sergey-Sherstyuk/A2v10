﻿
using Microsoft.VisualStudio.TestTools.UnitTesting;
using A2v10.Lang;

namespace A2v10.Tests.Lang
{
	[TestClass]
	[TestCategory("Workflow")]
	public class TSParserTest
	{
		[TestMethod]
		public void ParseFile()
		{
			var parser = new TSDefParser(null, null);
			parser.Parse("c:\\git\\a2v10\\apps\\Develop\\sales\\waybill\\model.d.ts");
		}
	}
}
