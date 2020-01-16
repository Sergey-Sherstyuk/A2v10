// Copyright � 2015-2020 Alex Kukhtin. All rights reserved.

#pragma once

class CFiscalPrinter_DatecsBase : public CFiscalPrinterImpl
{
	HANDLE m_hCom;

public:
	CFiscalPrinter_DatecsBase();

	virtual bool IsOpen() const override;
	virtual bool Open(const wchar_t* Port, DWORD nBaudRate) override;
	virtual void Close() override;

protected:
	void OpenComPort(const wchar_t* Port, DWORD nBaudRate /*= CBR_19200*/);
	void CloseComPort();

	virtual void CheckStatus();
	virtual void GetErrorCode();
	virtual std::wstring GetLastErrorS();

	BYTE m_sndBuffer[256];
	BYTE m_rcvBuffer[256];
	BYTE m_status[6];
	BYTE m_data[128];

	int  m_sndBytes;
	int  m_rcvBytes;
	static BYTE m_seq;
	int  m_lastArt;
	DWORD m_dwError;
	bool m_bEndOfTape;

	void ClearBuffers();
	void CreateCommand(BYTE cmd, const wchar_t* strCmd);
	void CreateCommandB(BYTE cmd, BYTE* data, BYTE len);
	void CreateCommand(BYTE cmd);
	void SendCommand(bool bResend = true);
	bool ParseRcv();
	void IncSeq();
	void IncSeqAndBuffer();
	void CalcSendCRC();

	void ThrowLastError();
	void ThrowCommonError();
};
