// Copyright © 2015-2021 Alex Kukhtin. All rights reserved.
// version 7372

'use strict';

(function () {

	const token = '$(Token)';

	const PWD_SCORE_STRONG = 60;
	const PWD_SCORE_GOOD = 40;

	$(Utils)
	$(Locale)

	// MODE: email -> confirm -> reset

	const vm = new Vue({
		el: "#app",
		data: {
			email: '',
			password: '',
			confirm: '',
			code: '',
			processing: false,
			info: $(PageData),
			appLinks: $(AppLinks),
			appData: $(AppData),
			submitted: false,
			serverError: '',
			emailError: '',
			passwordError: '',
			mode: '',
			confirmText: '',
		},
		computed: {
			hasLogo() {
				return this.appData && this.appData.appLogo;
			},
			logoSrc() {
				return this.appData.appLogo;
			},
			valid: function () {
				if (!this.submitted) return true;
				return this.validEmail;
			},
			validEmail: function () {
				if (!this.submitted) return true;
				return this.validEmailInline;
			},
			validEmailInline: function () {
				if (!this.email) {
					this.emailError = this.locale.$EnterEMail;
					return false;
				} else if (!validEmail(this.email)) {
					this.emailError = this.locale.$InvalidEMail;
					return false;
				}
				this.emailError = '';
				return true;
			},
			validPassword() {
				if (!this.submitted) return true;
				if (!this.password) {
					this.passwordError = this.locale.$EnterPassword;
					return false;
				}
				else if (this.password.length < 6) {
					this.passwordError = this.locale.$PasswordLength;
					return false;
				}
				else if (this.password > 0 && this.pwdScore < PWD_SCORE_STRONG) {
					this.passwordError = 'Пароль занадто простий';
					return false;
				}
				this.passwordError = '';
				return true;
			},
			validConfirm() {
				return this.submitted ? !!this.confirm && (this.password === this.confirm) : true;
			},
			locale: function() {
				return window.$$locale;
			},
			passwordError() {
				return 'TODO:passwordError';
			},
			confirmCodeDisabled() {
				return !this.code;
			},
			emailVisible() { return this.mode === ''; },
			codeVisible() { return this.mode === 'code'; },
			passwordVisible() { return this.mode === 'password'; },

			pwdScore() {
				return this.calculatePwdScore(this.password);
			},
			pwdIcon() {
				if (!this.password)
					return '';
				else if (this.pwdScore >= PWD_SCORE_STRONG)
					return 'success-green';
				else if (this.pwdScore >= PWD_SCORE_GOOD)
					return 'warning-yellow';
				else
					return 'alert';
			},
			pwdLabelContent() {
				if (!this.password)
					return '';
				else if (this.pwdScore >= PWD_SCORE_STRONG)
					return 'Надійний';
				else if (this.pwdScore >= PWD_SCORE_GOOD)
					return 'Треба трохи складніше';
				else
					return 'Занадто простий';
			}

		},
		methods: {
			submitCode() {
				this.submitted = true;
				this.serverError = '';
				this.code = this.code.trim();
				if (!this.code)
					return;
				this.processing = true;
				let dataToSend = {
					Email: this.email,
					Code: this.code
				};
				const that = this;
				post('/account/forgotpasswordcode', dataToSend)
					.then(function (response) {
						that.processing = false;
						switch (response.Status) {
							case 'Success':
								that.mode = 'password';
								that.confirmText = that.locale.$ConfirmReset.replace('{0}', that.email);
								break;
							case "InvalidCode":
								that.serverError = that.locale.$InvalidConfirmCode;
								break;
							default:
								alert(result);
								break;
						}
					})
					.catch(function (error) {
						that.processing = false;
						alert(error);
					});
			},
			submitReset() {
				this.submitted = true;
				this.serverError = '';
				if (!this.valid)
					return;
				if (!this.validPassword)
					return;
				if (!this.validConfirm)
					return;
				this.processing = true;
				let dataToSend = {
					email: this.email,
					Password: this.password,
					Confirm: this.confirm,
					Code: this.code
				};
				const that = this;
				post('/account/resetpassword', dataToSend)
					.then(function (response) {
						that.processing = false;
						switch (response.Status) {
							case 'Success':
								window.location.assign('/');
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
			submitForgot: function() {
				this.submitted = true;
				this.serverError = '';
				this.email = this.email.trim();
				if (!this.valid)
					return;
				this.processing = true;
				let dataToSend = {
					Email: this.email
				};
				const that = this;
				post('/account/forgotpassword', dataToSend)
					.then(function (response) {
						that.processing = false;
						let result = response.Status;
						if (result === 'Success') {
							that.confirmText = that.locale.$ConfirmReset.replace('{0}', that.email);
							that.mode = 'code';
						} else if (result === 'NotFound') {
							that.serverError = that.locale.$InvalidEMailError;
						} else if (result === 'NotAllowed') {
							that.serverError = that.locale.$ResetPasswordNotAllowed;
						}
						else
							alert(result);
					})
					.catch(function (error) {
						that.processing = false;
						alert(error);
					});
			},
			failure: function(msg) {
				this.submitted = false;
				this.serverError = msg;
			},
			reload: function() {
				window.location.reload();
			},
			getReferUrl: function(url) {
				return getReferralUrl(url);
			},

			calculatePwdScore(pwd) {
				pwd = pwd.replace('spivdiia.com', '');
				pwd = pwd.replace('spivdiia', '');

				var score = 0;
				if (!pwd) {
					return score;
				}
				// award every unique letter until 5 repetitions
				var letters = new Object();
				for (var i = 0; i < pwd.length; i++) {
					letters[pwd[i]] = (letters[pwd[i]] || 0) + 1;
					score += 5.0 / letters[pwd[i]];
				}

				// bonus points for mixing it up
				var variations = {
					digits: /\d/.test(pwd),
					lower: /[a-z]/.test(pwd),
					upper: /[A-Z]/.test(pwd),
					nonWords: /\W/.test(pwd),
				}

				var variationCount = 0;
				for (var check in variations) {
					variationCount += (variations[check] == true) ? 1 : 0;
				}
				score += (variationCount - 1) * 10;

				// Якщо варіацій (груп) символів меньше 2 - score не більше PWD_SCORE_GOOD
				if (variationCount < 2)
					score = Math.min(score, PWD_SCORE_GOOD);

				return score;
			},
			showPasswordHelp() {
				//console.log(this);
				//const vm = this;
				//let title = `Вимоги до паролів`;
				let text = `Вимоги до паролів:
 - пароль повинен містити щонайменше 6 символів, але може знадобитися більше
 - у ньому мають бути як літери, так і цифри
 - бажано використовувати і маленькі і заглавні літери
 - бажано використовувати спецсимволи`;
				alert(text);
			}
		}
	});
})();