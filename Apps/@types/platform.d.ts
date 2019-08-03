﻿
/* Copyright © 2019 Alex Kukhtin. All rights reserved.*/

/*TODO:
controller methods
*/

declare function require(url: string): any;

interface IElement {
	readonly $valid: boolean;
	readonly $invalid: boolean;
	readonly $isNew: boolean;
	readonly $isEmpty: boolean;

	readonly $id: any;
	readonly $name: any;

	readonly $root: IRoot;
	readonly $parent: IElement;

	readonly $vm: ViewModel;
	readonly $ctrl: IController;

	$merge(src: object): void;
	$empty(this: IElement): void;
}

interface IArrayElement extends IElement {
	$remove(): void;
}

declare const enum InsertTo {
	start = 'start',
	end = 'end',
	above = 'above',
	below = 'below'
}

interface IElementArray<T> {
	[index: number]: T;

	readonly Count: number;
	readonly $isEmpty: boolean;
	readonly $hasSelected: boolean;
	readonly $checked: IElementArray<T>;
	readonly $selectedIndex: number;

	Selected(prop: string): IElementArray<T>;

	$append(src?: object): T;
	$prepend(src?: object): T;
	$insert(src: object, to: InsertTo, ref?: T): T;

	$clearSelected(): void;
	$load(): void;
	$loadLazy(): Promise<IElementArray<T>>;

	$isLazy(): boolean;

	$remove(elem: T): IElementArray<T>;
	$empty(): IElementArray<T>;
	$renumberRows(): IElementArray<T>;
	$copy(src: any[]): IElementArray<T>;
}

interface IRoot extends IElement {
	readonly $readOnly: boolean,
	readonly $stateReadOnly: boolean,
	readonly $isCopy: boolean
	readonly $template: Template;

	$defer(): void;
	$emit(): void;
	$forceValidate(): void;
	$setDirty(): void;

}


/* template commands */
interface templateCommandFunc { (this: IRoot, arg?: any): void; }

interface templateCommandObj {
	exec: templateCommandFunc,
	canExec?: (this: IRoot, arg?: any) => boolean;
	confirm?: string;
	saveRequired?: boolean;
}

declare type templateCommand = templateCommandFunc | templateCommandObj;

/* template properties */
interface templatePropertyGetterSetter {
	get(this: IElement): any;
	set?(this: IElement, val: any): void;
}
interface templatePropertyGetter { (this: IElement): any; }

declare type templateProperty = templatePropertyGetter | templatePropertyGetterSetter | StringConstructor | BooleanConstructor | NumberConstructor;

/* template events */
interface templateEventChange { (this: IElement, elem: IElement, newVal?: any, oldVal?: any, prop?: string): void; }
interface templateEventAdd { (this: IElement, array?: IElementArray<IElement>, elem?: IElement): void; }
interface templateEventUnload { (this: IElement, elem?: IElement): void; }

declare type templateEvent = templateEventChange | templateEventAdd | templateEventUnload;

declare const enum StdValidator {
	notBlank = 'notBlank',
	email = 'email',
	url = 'url',
	isTrue = 'isTrue'
}

declare const enum Severity {
	error = 'error',
	warning = 'warning',
	info = 'info'
}

/* template validators */

interface tempateValidatorFunc { (elem: IElement, value?: any): boolean; }

interface templateValidatorObj {
	valid: tempateValidatorFunc | StdValidator,
	async?: boolean,
	msg?: string,
	severity?: Severity
}

declare type templateValidator = String | tempateValidatorFunc | templateValidatorObj;

interface Template {
	options?: {
		noDirty?: boolean
	};
	properties?: {
		[prop: string]: templateProperty
	};
	validators?: {
		[prop: string]: templateValidator | templateValidator[]
	};
	events?: {
		[prop: string]: templateEvent
	};
	commands?: {
		[prop: string]: templateCommand
	};
	delegates?: {
		[prop: string]: (this: IRoot, ...args: any[]) => any
	};
}

interface IController {
	$save(): Promise<object>;
	$requery(): void;
	$reload(args?: any): void;
	$invoke(command: string, arg: object, path?: string): Promise<object>;
	$close(): void;
	$modalClose(result?: any): any;
	$msg(): any; //TODO
	$alert(msg: string | IMessage);
	$confirm(msg: string | IMessage): Promise<boolean>;
	$showDialog(url: string): Promise<object>;
	$saveModified(msg?: string, title?: string): boolean;
	$asyncValid(cmd: string, arg: object): any; //TODO
	$toast(): any; //TODO
	$notifyOwner(): any; //TODO
	$navigate(url: string): void; //TODO
	$defer(): any; //TODO
	$setFilter(): any; //TODO
}

interface IMessage {
	msg: string;
	style?: string;
	list?: any;
}


interface ViewModel extends IController {
	$getErrors(severity: string): any[]; // TODO result type
}

// utilities

declare const enum DataType {
	Currency = "Currency",
	Number = "Number",
	DateTime = "DateTime",
	Date = "Date",
	Time = "Time"
}

declare const enum DateTimeUnit {
	year = 'year',
	month = 'month',
	day = 'day',
	hour = 'hour',
	minute = 'minute',
	second = 'second'

}

interface UtilsDate {
	formatDate(date: Date): string;
	today(): Date,
	zero(): Date,
	equal(d1: Date, d2: Date): boolean;
	isZero(d: Date): boolean;
	add(d: Date, nm: number, unit: DateTimeUnit);
}

interface UtilsText {
	contains(text: string, probe: string): boolean;
}

interface UtilsCurrency {
	round(val: number, digits?: number): number;
	format(val: any): string;
}

interface Utils {
	isArray(arg: any): boolean;
	isFunction(arg: any): boolean;
	isDefined(arg: any): boolean;
	isObject(arg: any): boolean;
	isObjectExact(arg: any): boolean;
	isDate(arg: any): boolean;
	isString(arg: any): boolean;
	isNumber(arg: any): boolean;
	isBoolean(arg: any): boolean;

	toNumber(arg: any): number;
	toString(arg: any): string;

	notBlank(arg: any): boolean;

	toJson(arg: object): string;
	fromJson(arg: string): object;

	isEqual(o1: any, o2: any): boolean;

	format(arg: any, dataType: DataType, opts?: { format?: string, hideZeros?: boolean });
	date: UtilsDate;
	text: UtilsText;
	currency: UtilsCurrency;
}

interface Http {
	$post(url: string, data?: string | Blob): Promise<any>;
	$get(url: string): Promise<any>;
}

interface EventBus {
	$on(name: string, handler: (...params: any[]) => any);
	$off(name: string, handler: (...params: any[]) => any);
	$once(name: string, handler: (...params: any[]) => any);
	$emit(name: string, ...params: any[]);
}