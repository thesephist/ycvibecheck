/* oak build --web */
// module system
const __Oak_Modules = {};
let __Oak_Import_Aliases;
function __oak_modularize(name, fn) {
	__Oak_Modules[name] = fn;
}
function __oak_module_import(name) {
	if (typeof __Oak_Modules[name] === 'object') return __Oak_Modules[name];
	const module = __Oak_Modules[name] || __Oak_Modules[__Oak_Import_Aliases[name]];
	if (module) {
		__Oak_Modules[name] = {}; // break circular imports
		return __Oak_Modules[name] = module();
	} else {
		throw new Error(`Could not import Oak module "${name}" at runtime`);
	}
}

// language primitives
let __oak_empty_assgn_tgt;
function __oak_eq(a, b) {
	if (a === __Oak_Empty || b === __Oak_Empty) return true;

	// match either null or undefined to compare correctly against undefined ?s
	// appearing in places like optional arguments
	if (a == null && b == null) return true;
	if (a == null || b == null) return false;

	// match all other types that can be compared cheaply (without function
	// calls for type coercion or recursive descent)
	if (typeof a === 'boolean' || typeof a === 'number' ||
		typeof a === 'symbol' || typeof a === 'function') {
		return a === b;
	}

	// string equality check
	a = __as_oak_string(a);
	b = __as_oak_string(b);
	if (typeof a !== typeof b) return false;
	if (__is_oak_string(a) && __is_oak_string(b)) {
		return a.valueOf() === b.valueOf();
	}

	// deep equality check for composite values
	if (len(a) !== len(b)) return false;
	for (const key of keys(a)) {
		if (!__oak_eq(a[key], b[key])) return false;
	}
	return true;
}
function __oak_acc(tgt, prop) {
	return (__is_oak_string(tgt) ? __as_oak_string(tgt.valueOf()[prop]) : tgt[prop]) ?? null;
}
function __oak_obj_key(x) {
	return typeof x === 'symbol' ? Symbol.keyFor(x) : x;
}
function __oak_push(a, b) {
	a = __as_oak_string(a);
	a.push(b);
	return a;
}
function __oak_and(a, b) {
	if (typeof a === 'boolean' && typeof b === 'boolean') {
		return a && b;
	}
	if (__is_oak_string(a) && __is_oak_string(b)) {
		const max = Math.max(a.length, b.length);
		const get = (s, i) => s.valueOf().charCodeAt(i) || 0;

		let res = '';
		for (let i = 0; i < max; i ++) {
			res += String.fromCharCode(get(a, i) & get(b, i));
		}
		return res;
	}
	return a & b;
}
function __oak_or(a, b) {
	if (typeof a === 'boolean' && typeof b === 'boolean') {
		return a || b;
	}
	if (__is_oak_string(a) && __is_oak_string(b)) {
		const max = Math.max(a.length, b.length);
		const get = (s, i) => s.valueOf().charCodeAt(i) || 0;

		let res = '';
		for (let i = 0; i < max; i ++) {
			res += String.fromCharCode(get(a, i) | get(b, i));
		}
		return res;
	}
	return a | b;
}
function __oak_xor(a, b) {
	if (typeof a === 'boolean' && typeof b === 'boolean') {
		return (a && !b) || (!a && b);
	}
	if (__is_oak_string(a) && __is_oak_string(b)) {
		const max = Math.max(a.length, b.length);
		const get = (s, i) => s.valueOf().charCodeAt(i) || 0;

		let res = '';
		for (let i = 0; i < max; i ++) {
			res += String.fromCharCode(get(a, i) ^ get(b, i));
		}
		return res;
	}
	return a ^ b;
}
const __Oak_Empty = Symbol('__Oak_Empty');

// mutable string type
function __is_oak_string(x) {
	if (x == null) return false;
	return x.__mark_oak_string;
}
function __as_oak_string(x) {
	if (typeof x === 'string') return __Oak_String(x);
	return x;
}
const __Oak_String = s => {
	return {
		__mark_oak_string: true,
		assign(i, slice) {
			if (i === s.length) return s += slice;
			return s = s.substr(0, i) + slice + s.substr(i + slice.length);
		},
		push(slice) {
			s += slice;
		},
		toString() {
			return s;
		},
		valueOf() {
			return s;
		},
		get length() {
			return s.length;
		},
	}
}

// tail recursion trampoline helpers
function __oak_resolve_trampoline(fn, ...args) {
	let rv = fn(...args);
	while (rv && rv.__is_oak_trampoline) {
		rv = rv.fn(...rv.args);
	}
	return rv;
}
function __oak_trampoline(fn, ...args) {
	return {
		__is_oak_trampoline: true,
		fn: fn,
		args: args,
	}
}

// env (builtin) functions

// reflection and types
const __Is_Oak_Node = typeof process === 'object';
const __Oak_Int_RE = /^[+-]?\d+$/;
function int(x) {
	x = __as_oak_string(x);
	if (typeof x === 'number') {
		// JS rounds towards higher magnitude, Oak rounds towards higher value
		const rounded = Math.floor(x);
		const diff = x - rounded;
		if (x < 0 && diff === 0.5) return rounded + 1;
		return rounded;
	}
	if (__is_oak_string(x) && __Oak_Int_RE.test(x.valueOf())) {
		const i = Number(x.valueOf());
		if (isNaN(i)) return null;
		return i;
	}
	return null;
}
function float(x) {
	x = __as_oak_string(x);
	if (typeof x === 'number') return x;
	if (__is_oak_string(x)) {
		const f = parseFloat(x.valueOf());
		if (isNaN(f)) return null;
		return f;
	}
	return null;
}
function atom(x) {
	x = __as_oak_string(x);
	if (typeof x === 'symbol' && x !== __Oak_Empty) return x;
	if (__is_oak_string(x)) return Symbol.for(x.valueOf());
	return Symbol.for(string(x));
}
function string(x) {
	x = __as_oak_string(x);
	function display(x) {
		x = __as_oak_string(x);
		if (__is_oak_string(x)) {
			return '\'' + x.valueOf().replace('\\', '\\\\').replace('\'', '\\\'') + '\'';
		} else if (typeof x === 'symbol') {
			if (x === __Oak_Empty) return '_';
			return ':' + Symbol.keyFor(x);
		}
		return string(x);
	}
	if (x == null) {
		return '?';
	} else if (typeof x === 'number') {
		return x.toString();
	} else if (__is_oak_string(x)) {
		return x;
	} else if (typeof x === 'boolean') {
		return x.toString();
	} else if (typeof x === 'function') {
		return x.toString();
	} else if (typeof x === 'symbol') {
		if (x === __Oak_Empty) return '_';
		return Symbol.keyFor(x);
	} else if (Array.isArray(x)) {
		return '[' + x.map(display).join(', ') + ']';
	} else if (typeof x === 'object') {
		const entries = [];
		for (const key of keys(x).sort()) {
			entries.push(`${key}: ${display(x[key])}`);
		}
		return '{' + entries.join(', ') + '}';
	}
	throw new Error('string() called on unknown type ' + x.toString());
}
function codepoint(c) {
	c = __as_oak_string(c);
	return c.valueOf().charCodeAt(0);
}
function char(n) {
	return String.fromCharCode(n);
}
function type(x) {
	x = __as_oak_string(x);
	if (x == null) {
		return Symbol.for('null');
	} else if (typeof x === 'number') {
		// Many discrete APIs check for :int, so we consider all integer
		// numbers :int and fall back to :float. This is not an airtight
		// solution, but works well enough and the alternative (tagged number
		// values/types) have poor perf tradeoffs.
		if (Number.isInteger(x)) return Symbol.for('int');
		return Symbol.for('float');
	} else if (__is_oak_string(x)) {
		return Symbol.for('string');
	} else if (typeof x === 'boolean') {
		return Symbol.for('bool');
	} else if (typeof x === 'symbol') {
		if (x === __Oak_Empty) return Symbol.for('empty');
		return Symbol.for('atom');
	} else if (typeof x === 'function') {
		return Symbol.for('function');
	} else if (Array.isArray(x)) {
		return Symbol.for('list');
	} else if (typeof x === 'object') {
		return Symbol.for('object');
	}
	throw new Error('type() called on unknown type ' + x.toString());
}
function len(x) {
	if (typeof x === 'string' || __is_oak_string(x) || Array.isArray(x)) {
		return x.length;
	} else if (typeof x === 'object' && x !== null) {
		return Object.getOwnPropertyNames(x).length;
	}
	throw new Error('len() takes a string or composite value, but got ' + string(x));
}
function keys(x) {
	if (Array.isArray(x)) {
		const k = [];
		for (let i = 0; i < x.length; i ++) k.push(i);
		return k;
	} else if (typeof x === 'object' && x !== null) {
		return Object.getOwnPropertyNames(x).map(__as_oak_string);
	}
	throw new Error('keys() takes a composite value, but got ' + string(x).valueOf());
}

// OS interfaces
function args() {
	if (__Is_Oak_Node) return process.argv.map(__as_oak_string);
	return [window.location.href];
}
function env() {
	if (__Is_Oak_Node) {
		const e = Object.assign({}, process.env);
		for (const key in e) {
			e[key] = __as_oak_string(e[key]);
		}
		return e;
	}
	return {};
}
function time() {
	return Date.now() / 1000;
}
function nanotime() {
	return int(Date.now() * 1000000);
}
function rand() {
	return Math.random();
}
let randomBytes;
function srand(length) {
	if (__Is_Oak_Node) {
		// lazily import dependency
		if (!randomBytes) randomBytes = require('crypto').randomBytes;
		return randomBytes(length).toString('latin1');
	}

	const bytes = crypto.getRandomValues(new Uint8Array(length));
	return __as_oak_string(Array.from(bytes).map(b => String.fromCharCode(b)).join(''));
}
function wait(duration, cb) {
	setTimeout(cb, duration * 1000);
	return null;
}
function exit(code) {
	if (__Is_Oak_Node) process.exit(code);
	return null;
}
function exec() {
	throw new Error('exec() not implemented');
}

// I/O
function input() {
	throw new Error('input() not implemented');
}
function print(s) {
	s = __as_oak_string(s);
	if (__Is_Oak_Node) {
		process.stdout.write(string(s).toString());
	} else {
		console.log(string(s).toString());
	}
	return s.length;
}
function ls() {
	throw new Error('ls() not implemented');
}
function rm() {
	throw new Error('rm() not implemented');
}
function mkdir() {
	throw new Error('mkdir() not implemented');
}
function stat() {
	throw new Error('stat() not implemented');
}
function open() {
	throw new Error('open() not implemented');
}
function close() {
	throw new Error('close() not implemented');
}
function read() {
	throw new Error('read() not implemented');
}
function write() {
	throw new Error('write() not implemented');
}
function listen() {
	throw new Error('listen() not implemented');
}
function req() {
	throw new Error('req() not implemented');
}

// math
function sin(n) {
	return Math.sin(n);
}
function cos(n) {
	return Math.cos(n);
}
function tan(n) {
	return Math.tan(n);
}
function asin(n) {
	return Math.asin(n);
}
function acos(n) {
	return Math.acos(n);
}
function atan(n) {
	return Math.atan(n);
}
function pow(b, n) {
	return Math.pow(b, n);
}
function log(b, n) {
	return Math.log(n) / Math.log(b);
}

// runtime
function ___runtime_lib() {
	throw new Error('___runtime_lib() not implemented');
}
function ___runtime_lib__oak_qm() {
	throw new Error('___runtime_lib?() not implemented');
}
function ___runtime_gc() {
	throw new Error('___runtime_gc() not implemented');
}
function ___runtime_mem() {
	throw new Error('___runtime_mem() not implemented');
}
function ___runtime_proc() {
	throw new Error('___runtime_proc() not implemented');
}

// JavaScript interop
function call(target, fn, ...args) {
	return target[Symbol.keyFor(fn)](...args);
}
function __oak_js_new(Constructor, ...args) {
	return new Constructor(...args);
}
function __oak_js_try(fn) {
	try {
		return {
			type: Symbol.for('ok'),
			ok: fn(),
		}
	} catch (e) {
		return {
			type: Symbol.for('error'),
			error: e,
		}
	}
}
(__oak_modularize(__Oak_String(`lib/search.js.oak`),function _(){return ((autocomplete,company,countMatches,entries,escapeForRegExp,filter,fmt,join,map,merge,news,println,queryEncode,reduce,similar,sort,split,trim)=>(({println,map,merge,reduce,filter,entries}=__oak_module_import(__Oak_String(`std`))),({join,split,trim}=__oak_module_import(__Oak_String(`str`))),(fmt=__oak_module_import(__Oak_String(`fmt`))),(sort=__oak_module_import(__Oak_String(`sort`))),queryEncode=function queryEncode(opts=null){return join(map(filter(entries(opts),function _(entry=null){return !__oak_eq(__oak_acc(entry,1),null)}),function _(entry=null){return __as_oak_string(__as_oak_string(__oak_acc(entry,0)+__Oak_String(`=`))+encodeURIComponent(__oak_acc(entry,1)))}),__Oak_String(`&`))},company=function company(slug=null,withData=null){return ((handleError)=>(handleError=function handleError(err=null){return (withData(null))},(fetch(__as_oak_string(__Oak_String(`/company?`)+queryEncode(({slug})))).then)(function _(resp=null){return ((__oak_cond)=>__oak_eq(__oak_cond,200)?((resp.json)().then)(function _(data=null){return (withData(data))}):handleError)((resp.status??null))},handleError)))()},similar=function similar(query=null,withData=null){return ((handleError)=>(merge(query,({n:50})),handleError=function handleError(err=null){return (withData(null))},(fetch(__as_oak_string(__Oak_String(`/search?`)+queryEncode(query))).then)(function _(resp=null){return ((__oak_cond)=>__oak_eq(__oak_cond,200)?((resp.json)().then)(function _(data=null){return (withData(data))}):handleError)((resp.status??null))},handleError)))()},news=function news(query=null,withData=null){return ((handleError,url)=>(handleError=function handleError(err=null){return (withData([]))},(url=__as_oak_string(__Oak_String(`https://hn.algolia.com/api/v1/search?`)+queryEncode(({query,tags:__Oak_String(`(story,show_hn,ask_hn)`),restrictSearchableAttributes:__Oak_String(`title,story_text`),queryType:__Oak_String(`prefixNone`),advancedSyntax:false,typoTolerance:false,hitsPerPage:8})))),(fetch(url).then)(function _(resp=null){return ((__oak_cond)=>__oak_eq(__oak_cond,200)?((resp.json)().then)(function _(data=null){return (withData((data.hits??null)))}):handleError)((resp.status??null))},handleError)))()},escapeForRegExp=function escapeForRegExp(s=null){return map(s,function _(c=null){return ((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(`.`))?__as_oak_string(__Oak_String(`\\`)+c):__oak_eq(__oak_cond,__Oak_String(`*`))?__as_oak_string(__Oak_String(`\\`)+c):__oak_eq(__oak_cond,__Oak_String(`+`))?__as_oak_string(__Oak_String(`\\`)+c):__oak_eq(__oak_cond,__Oak_String(`?`))?__as_oak_string(__Oak_String(`\\`)+c):__oak_eq(__oak_cond,__Oak_String(`^`))?__as_oak_string(__Oak_String(`\\`)+c):__oak_eq(__oak_cond,__Oak_String(`$`))?__as_oak_string(__Oak_String(`\\`)+c):__oak_eq(__oak_cond,__Oak_String(`{`))?__as_oak_string(__Oak_String(`\\`)+c):__oak_eq(__oak_cond,__Oak_String(`}`))?__as_oak_string(__Oak_String(`\\`)+c):__oak_eq(__oak_cond,__Oak_String(`[`))?__as_oak_string(__Oak_String(`\\`)+c):__oak_eq(__oak_cond,__Oak_String(`]`))?__as_oak_string(__Oak_String(`\\`)+c):__oak_eq(__oak_cond,__Oak_String(`(`))?__as_oak_string(__Oak_String(`\\`)+c):__oak_eq(__oak_cond,__Oak_String(`)`))?__as_oak_string(__Oak_String(`\\`)+c):__oak_eq(__oak_cond,__Oak_String(`|`))?__as_oak_string(__Oak_String(`\\`)+c):__oak_eq(__oak_cond,__Oak_String(`\\`))?__as_oak_string(__Oak_String(`\\`)+c):c)(c)})},countMatches=function countMatches(s=null,regexpExec=null){return ((sub)=>(sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,null)?i:__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1)))(regexpExec(s))}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},sub(0)))()},autocomplete=function autocomplete(query=null){return ((words)=>((words=filter(split(trim(query),__Oak_String(` `)),function _(s=null){return !__oak_eq(s,__Oak_String(``))})),((__oak_cond)=>__oak_eq(__oak_cond,0)?[]:((suggestions)=>((suggestions=reduce(words,YC_NAMES_DESC,function _(suggestions=null,word=null,i=null){return ((lastWord__oak_qm,regexp)=>((lastWord__oak_qm=__oak_eq(__as_oak_string(i+1),len(words))),(regexp=__oak_js_new(RegExp,__as_oak_string(__as_oak_string(__Oak_String(`(^|\\W)`)+escapeForRegExp(word))+((__oak_cond)=>__oak_eq(__oak_cond,lastWord__oak_qm)?__Oak_String(``):__Oak_String(`($|\\W)`))(true)),__Oak_String(`img`))),filter(suggestions,function _(sugg=null){let count;return ((__oak_cond)=>__oak_eq(__oak_cond,0)?false:true)((count=countMatches(__oak_acc(sugg,0),((regexp.exec??null).bind)(regexp))))})))()})),(sort.sort)(suggestions,function _(sugg=null){return __oak_acc(sugg,0)})))())(len(words))))()},({autocomplete,company,countMatches,entries,escapeForRegExp,filter,fmt,join,map,merge,news,println,queryEncode,reduce,similar,sort,split,trim})))()}),__oak_modularize(__Oak_String(`lib/torus.js.oak`),function _(){return ((Renderer,__oak_js_default,h,map)=>(({__oak_js_default,map}=__oak_module_import(__Oak_String(`std`))),h=function h(tag=null,...args){return ((attrs,children,classes,events)=>(((__oak_cond)=>__oak_eq(__oak_cond,0)?null:__oak_eq(__oak_cond,1)?([children=null]=args):__oak_eq(__oak_cond,2)?([classes=null,children=null]=args):__oak_eq(__oak_cond,3)?([classes=null,attrs=null,children=null]=args):([classes=null,attrs=null,events=null,children=null]=args))(len(args)),(classes=__oak_js_default(classes,[])),(attrs=__oak_js_default(attrs,({}))),(events=__oak_js_default(events,({}))),(children=__oak_js_default(children,[])),({tag:String(string(tag)),attrs:((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(__Oak_String(`class`),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__Oak_String(`class`)]):(__oak_assgn_tgt[__Oak_String(`class`)])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(attrs),map(classes,String)),events,children:map(children,function _(child=null){return ((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('string'))?String(child):child)(type(child))})})))()},Renderer=function Renderer(root=null){return ((initialDOM,node,render,self,update)=>(((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('string'))?(root=(document.querySelector)(root)):null)(type(root)),(render=((window.Torus??null).render??null)),(initialDOM=h(Symbol.for('div'))),(node=render(null,null,initialDOM)),(root.appendChild)(node),(self=({node,prev:initialDOM,update:update=function update(jdom=null){return (((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(node,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.node):(__oak_assgn_tgt.node)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(self),render((self.node??null),(self.prev??null),jdom)),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(prev,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.prev):(__oak_assgn_tgt.prev)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(self),jdom),(self.node??null))}}))))()},({Renderer,__oak_js_default,h,map})))()}),__oak_modularize(__Oak_String(`src/app.js.oak`),function _(){return ((Batches,Company,CompanyList,ExternalLink,Label,LandingParams,Link,MaxAutocompletes,Renderer,State,Tag,WelcomeMessage,append,autocompleteVisible__oak_qm,cleanName,compact,contains__oak_qm,__oak_js_default,filter,h,hideWelcome,map,performSearch,println,r,render,search,suggestionString,take,toggleColorScheme,trim,trimEnd,trimStart,urlDisplayHostname)=>(({println,__oak_js_default,map,take,append,filter,compact,contains__oak_qm}=__oak_module_import(__Oak_String(`std`))),({trim,trimStart,trimEnd}=__oak_module_import(__Oak_String(`str`))),({Renderer,h}=__oak_module_import(__Oak_String(`lib/torus.js.oak`))),(search=__oak_module_import(__Oak_String(`lib/search.js.oak`))),(MaxAutocompletes=12),(Batches=[__Oak_String(`S21`),__Oak_String(`W21`),__Oak_String(`S20`),__Oak_String(`W20`),__Oak_String(`S19`),__Oak_String(`W19`),__Oak_String(`S18`),__Oak_String(`W18`),__Oak_String(`S17`),__Oak_String(`W17`),__Oak_String(`S16`),__Oak_String(`W16`)]),(LandingParams=(__oak_js_new(URL,(location.href??null)).searchParams??null)),(State=({search:({loading__oak_qm:false,query:__oak_js_default((LandingParams.get)(__Oak_String(`q`)),__Oak_String(``)),batch:__oak_js_default((LandingParams.get)(__Oak_String(`batch`)),null),show_inactive:!__oak_eq((LandingParams.get)(__Oak_String(`show_inactive`)),__Oak_String(`false`)),expandedCompanies:[]}),autocomplete:({show__oak_qm:false,idx:0,suggestions:[]}),filters:({batch:null,status:null}),news:({}),scrapes:({}),results:[],colorscheme:((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(`dark`))?__Oak_String(`dark`):__Oak_String(`light`))((localStorage.getItem)(__Oak_String(`colorscheme`))),showWelcome__oak_qm:((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(`false`))?false:true)((localStorage.getItem)(__Oak_String(`should_show_welcome`)))})),performSearch=function performSearch(){return ((searchParams,url)=>(((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(loading__oak_qm,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.loading__oak_qm):(__oak_assgn_tgt.loading__oak_qm)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string((State.search??null)),true),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(expandedCompanies,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.expandedCompanies):(__oak_assgn_tgt.expandedCompanies)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string((State.search??null)),[]),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(news,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.news):(__oak_assgn_tgt.news)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(State),({})),render(),(url=__oak_js_new(URL,(location.href??null))),(searchParams=(url.searchParams??null)),((__oak_cond)=>__oak_eq(__oak_cond,true)?(searchParams.set)(__Oak_String(`q`),((State.search??null).query??null)):null)(!__oak_eq(((State.search??null).query??null),__Oak_String(``))),((__oak_cond)=>__oak_eq(__oak_cond,true)?(searchParams.set)(__Oak_String(`batch`),((State.search??null).batch??null)):null)(!__oak_eq(((State.search??null).batch??null),null)),((__oak_cond)=>__oak_eq(__oak_cond,true)?(searchParams.set)(__Oak_String(`show_inactive`),__Oak_String(`false`)):null)(!((State.search??null).show_inactive??null)),(history.replaceState)(null,null,String(url)),(search.similar)(({text:trim(((State.search??null).query??null)),batch:((State.search??null).batch??null),show_inactive:((State.search??null).show_inactive??null)}),function _(companies=null){return (((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(loading__oak_qm,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.loading__oak_qm):(__oak_assgn_tgt.loading__oak_qm)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string((State.search??null)),false),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(results,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.results):(__oak_assgn_tgt.results)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(State),companies),render())})))()},urlDisplayHostname=function urlDisplayHostname(url=null){return (trimStart((__oak_js_new(URL,url).hostname??null),__Oak_String(`www.`)))},cleanName=function cleanName(name=null){return (trimEnd(trim(trimEnd(trimEnd(name,__Oak_String(`.`)),__Oak_String(`Inc`))),__Oak_String(`,`)))},hideWelcome=function hideWelcome(){return (((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(showWelcome__oak_qm,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.showWelcome__oak_qm):(__oak_assgn_tgt.showWelcome__oak_qm)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(State),false),(localStorage.setItem)(__Oak_String(`should_show_welcome`),__Oak_String(`false`)))},toggleColorScheme=function toggleColorScheme(){return (((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(colorscheme,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.colorscheme):(__oak_assgn_tgt.colorscheme)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(State),((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(`light`))?__Oak_String(`dark`):__Oak_String(`light`))((State.colorscheme??null))),(localStorage.setItem)(__Oak_String(`colorscheme`),(State.colorscheme??null)))},suggestionString=function suggestionString(sugg=null){return ((desc,name)=>(([name=null,desc=null]=sugg),__as_oak_string(__as_oak_string(name+__Oak_String(`. `))+desc)))()},autocompleteVisible__oak_qm=function autocompleteVisible__oak_qm(){return ((__oak_left=>__oak_left===false?false:__oak_and(__oak_left,(len(((State.autocomplete??null).suggestions??null))>0)))(((State.autocomplete??null).show__oak_qm??null)))},(r=Renderer(__Oak_String(`#root`))),Link=function Link(text=null,href=null,...classes){return h(Symbol.for('a'),classes,({href,target:__Oak_String(`_blank`)}),[text])},WelcomeMessage=function WelcomeMessage(){return ((Examples)=>((Examples=[__Oak_String(`AI safety`),__Oak_String(`climate change`),__Oak_String(`making remote work easy`),__Oak_String(`supersonic flight`),__Oak_String(`rapid grocery delivery`),__Oak_String(`nuclear fusion`),__Oak_String(`space infrastructure`)]),h(Symbol.for('div'),[__Oak_String(`welcome`)],[h(Symbol.for('h2'),[__Oak_String(`welcome-title`)],[__Oak_String(`Semantic search over every YC company ever`)]),h(Symbol.for('p'),[__Oak_String(`YC Vibe Check uses `),h(Symbol.for('em'),[__Oak_String(`semantic similarity`)]),__Oak_String(` to search Y Combinator's entire portfolio of over 3,000
			companies. Unlike the search box in `),Link(__Oak_String(`YC's directory`),__Oak_String(`https://www.ycombinator.com/companies`)),__Oak_String(`, `),h(Symbol.for('em'),[__Oak_String(`this`)]),__Oak_String(` search bar doesn't need you to get the keywords exactly right, only `),h(Symbol.for('em'),[__Oak_String(`close enough`)]),__Oak_String(` to what startups are building, to find them.`)]),h(Symbol.for('p'),[__Oak_String(`You can search for something very specific like "3D modeling for
			home design" or something very broad like "climate change." Here
			are a few starting places:`)]),h(Symbol.for('div'),[__Oak_String(`welcome-examples`)],(map(Examples,function _(ex=null){return h(Symbol.for('button'),[__Oak_String(`welcome-example-button`),((__oak_cond)=>__oak_eq(__oak_cond,ex)?__Oak_String(`example-selected`):__Oak_String(``))(((State.search??null).query??null))],({}),({click:function _(){return (((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(query,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.query):(__oak_assgn_tgt.query)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string((State.search??null)),ex),performSearch())}}),[ex])}))),h(Symbol.for('button'),[__Oak_String(`welcome-hide-button`)],({}),({click:function _(){return (hideWelcome(),render())}}),[])])))()},Tag=function Tag(text=null,type=null){return h(Symbol.for('div'),[__Oak_String(`tag`),((__oak_cond)=>__oak_eq(__oak_cond,null)?__Oak_String(``):__as_oak_string(__Oak_String(`tag-`)+type))(type)],[((__oak_cond)=>__oak_eq(__oak_cond,true)?h(Symbol.for('div'),[__Oak_String(`tag-type`)],[type]):null)(!__oak_eq(type,null)),h(Symbol.for('div'),[__Oak_String(`tag-value`)],[text])])},Label=function Label(type=null,text=null){return h(Symbol.for('div'),[__Oak_String(`label`)],[h(Symbol.for('div'),[__Oak_String(`label-type`)],[type]),h(Symbol.for('div'),[__Oak_String(`label-value`)],[text])])},ExternalLink=function ExternalLink(type=null,url=null){return h(Symbol.for('a'),[__Oak_String(`external-link`)],({href:url,target:__Oak_String(`_blank`),style:({color:__Oak_String(`transparent`),[__Oak_String(`background-image`)]:__as_oak_string(__as_oak_string(__Oak_String(`url("/img/icon-`)+string(type))+__Oak_String(`.png")`))})}),[string(type)])},Company=function Company(company=null){return ((expanded__oak_qm,id,imgSrc,long,news,one,scraped,scrapedCompany,tagEls,toggle)=>((id=(company.slug??null)),(expanded__oak_qm=contains__oak_qm(((State.search??null).expandedCompanies??null),id)),(scraped=__oak_js_default(__oak_acc((State.scrapes??null),__oak_obj_key((id))),({}))),(scrapedCompany=__oak_js_default((scraped.company??null),({}))),toggle=function toggle(){return (((__oak_cond)=>__oak_eq(__oak_cond,false)?(__oak_push(((State.search??null).expandedCompanies??null),id),((__oak_cond)=>__oak_eq(__oak_cond,true)?(search.news)(cleanName((company.name??null)),function _(stories=null){return (((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((id),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((id))]):(__oak_assgn_tgt[__oak_obj_key((id))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string((State.news??null)),stories),render())}):null)(__oak_eq(__oak_acc((State.news??null),__oak_obj_key((id))),null)),((__oak_cond)=>__oak_eq(__oak_cond,true)?(search.company)((company.slug??null),function _(companyData=null){return (((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((id),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((id))]):(__oak_assgn_tgt[__oak_obj_key((id))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string((State.scrapes??null)),companyData),render())}):null)(__oak_eq(__oak_acc((State.scrapes??null),__oak_obj_key((id))),null))):((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(expandedCompanies,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.expandedCompanies):(__oak_assgn_tgt.expandedCompanies)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string((State.search??null)),filter(((State.search??null).expandedCompanies??null),function _(c=null){return !__oak_eq(c,id)})))(expanded__oak_qm),render())},h(Symbol.for('div'),[__Oak_String(`company`),((__oak_cond)=>__oak_eq(__oak_cond,true)?__Oak_String(`company-expanded`):__Oak_String(`company-collapsed`))(expanded__oak_qm),((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(`Acquired`))?__Oak_String(`company-acquired`):__oak_eq(__oak_cond,__Oak_String(`Active`))?__Oak_String(`company-active`):__oak_eq(__oak_cond,__Oak_String(`Inactive`))?__Oak_String(`company-inactive`):__oak_eq(__oak_cond,__Oak_String(`Public`))?__Oak_String(`company-public`):null)((company.status??null))],({tabIndex:0}),({click:toggle,keypress:function _(evt=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?toggle():null)(__oak_eq((evt.key??null),__Oak_String(`Enter`)))}}),[h(Symbol.for('div'),[__Oak_String(`company-name-batch`)],[h(Symbol.for('div'),[__Oak_String(`company-name-batch-header`)],[((__oak_cond)=>__oak_eq(__oak_cond,null)?h(Symbol.for('div'),[__Oak_String(`company-img`),__Oak_String(`missing`)],[]):__oak_eq(__oak_cond,__Oak_String(``))?h(Symbol.for('div'),[__Oak_String(`company-img`),__Oak_String(`missing`)],[]):__oak_eq(__oak_cond,__Oak_String(`/avatars/thumb/missing.png`))?h(Symbol.for('div'),[__Oak_String(`company-img`),__Oak_String(`missing`)],[]):h(Symbol.for('img'),[__Oak_String(`company-img`)],({src:imgSrc}),[]))((imgSrc=(company.small_logo_thumb_url??null))),h(Symbol.for('div'),[__Oak_String(`company-name`)],[h(Symbol.for('a'),[__Oak_String(`primary-name`)],({href:(company.website??null),target:__Oak_String(`_blank`)}),({click:function _(evt=null){return (evt.stopPropagation)()}}),[cleanName((company.name??null))])]),h(Symbol.for('div'),[__Oak_String(`company-batch`)],[(company.batch??null)])]),((__oak_cond)=>__oak_eq(__oak_cond,true)?h(Symbol.for('div'),[__Oak_String(`company-name-batch-meta`)],[Label(__Oak_String(`Status`),(company.status??null)),Label(__Oak_String(`Team size`),(company.team_size??null)),Label(__Oak_String(`Location`),(company.location??null)),((__oak_cond)=>__oak_eq(__oak_cond,true)?Label(__Oak_String(`Founded`),(scrapedCompany.year_founded??null)):null)(!__oak_eq((scrapedCompany.year_founded??null),null)),((__oak_cond)=>__oak_eq(__oak_cond,true)?h(Symbol.for('div'),[__Oak_String(`company-name-batch-tags`)],tagEls):null)(!__oak_eq([],(tagEls=((genericTags,topCoTag)=>((topCoTag=((__oak_cond)=>__oak_eq(__oak_cond,true)?Tag(__Oak_String(`Yes`),__Oak_String(`Top Company`)):null)((company.top_company??null))),(genericTags=map((company.tags??null),function _(t=null){return Tag(t)})),compact(append([topCoTag],genericTags))))()))),h(Symbol.for('div'),[__Oak_String(`company-name-batch-links`)],[ExternalLink(Symbol.for('yc'),__as_oak_string(__Oak_String(`https://www.ycombinator.com/companies/`)+(company.slug??null))),((__oak_cond)=>__oak_eq(__oak_cond,true)?ExternalLink(Symbol.for('crunchbase'),(scrapedCompany.cb_url??null)):null)(!__oak_eq((scrapedCompany.cb_url??null),null)),((__oak_cond)=>__oak_eq(__oak_cond,true)?ExternalLink(Symbol.for('linkedin'),(scrapedCompany.linkedin_url??null)):null)(!__oak_eq((scrapedCompany.linkedin_url??null),null)),((__oak_cond)=>__oak_eq(__oak_cond,true)?ExternalLink(Symbol.for('twitter'),(scrapedCompany.twitter_url??null)):null)(!__oak_eq((scrapedCompany.twitter_url??null),null)),((__oak_cond)=>__oak_eq(__oak_cond,true)?ExternalLink(Symbol.for('facebook'),(scrapedCompany.fb_url??null)):null)(!__oak_eq((scrapedCompany.fb_url??null),null))])]):null)(expanded__oak_qm)]),h(Symbol.for('div'),[__Oak_String(`company-description`)],[h(Symbol.for('p'),[],[((__oak_cond)=>__oak_eq(__oak_cond,true)?((__oak_cond)=>__oak_eq(__oak_cond,null)?(company.one_liner??null):__oak_eq(__oak_cond,__Oak_String(``))?(company.one_liner??null):long)((long=(String((company.long_description??null)).trim)())):((__oak_cond)=>__oak_eq(__oak_cond,null)?__as_oak_string(take((company.long_description??null),80)+__Oak_String(`...`)):__oak_eq(__oak_cond,__Oak_String(``))?__as_oak_string(take((company.long_description??null),80)+__Oak_String(`...`)):one)((one=(String((company.one_liner??null)).trim)())))(expanded__oak_qm)]),((__oak_cond)=>__oak_eq(__oak_cond,true)?h(Symbol.for('div'),[__Oak_String(`former-names`)],(append([__Oak_String(`Formerly: `)],map((company.former_names??null),function _(name=null){return h(Symbol.for('span'),[__Oak_String(`former-name`)],[name])})))):null)(!__oak_eq((company.former_names??null),[])),((__oak_cond)=>__oak_eq(__oak_cond,true)?((__oak_cond)=>__oak_eq(__oak_cond,null)?null:__oak_eq(__oak_cond,[])?null:h(Symbol.for('div'),[__Oak_String(`company-news`)],[h(Symbol.for('div'),[__Oak_String(`company-news-header`)],[__Oak_String(`From the YC Directory`)]),h(Symbol.for('ul'),[__Oak_String(`company-news-list`)],(map(news,function _(story=null){return h(Symbol.for('li'),[__Oak_String(`company-news-item`)],({}),({click:function _(evt=null){return (evt.stopPropagation)()}}),[Link(h(Symbol.for('span'),[],[(story.title??null),h(Symbol.for('span'),[__Oak_String(`company-news-hostname`)],[urlDisplayHostname((story.url??null))])]),(story.url??null),__Oak_String(`company-news-link`)),h(Symbol.for('div'),[__Oak_String(`company-news-meta`)],[h(Symbol.for('span'),[__Oak_String(`company-news-date`)],[(story.date??null)])])])})))]))((news=(scraped.newsItems??null))):null)(expanded__oak_qm),((__oak_cond)=>__oak_eq(__oak_cond,true)?((__oak_cond)=>__oak_eq(__oak_cond,null)?null:__oak_eq(__oak_cond,[])?null:h(Symbol.for('div'),[__Oak_String(`company-news`)],[h(Symbol.for('div'),[__Oak_String(`company-news-header`)],[__Oak_String(`From Hacker News`)]),h(Symbol.for('ul'),[__Oak_String(`company-news-list`)],(map(news,function _(story=null){let url;return h(Symbol.for('li'),[__Oak_String(`company-news-item`)],({}),({click:function _(evt=null){return (evt.stopPropagation)()}}),[Link(h(Symbol.for('span'),[],[(story.title??null),((__oak_cond)=>__oak_eq(__oak_cond,null)?null:__oak_eq(__oak_cond,__Oak_String(``))?null:h(Symbol.for('span'),[__Oak_String(`company-news-hostname`)],[urlDisplayHostname((story.url??null))]))((story.url??null))]),((__oak_cond)=>__oak_eq(__oak_cond,null)?__as_oak_string(__Oak_String(`https://news.ycombinator.com/item?id=`)+(story.objectID??null)):__oak_eq(__oak_cond,__Oak_String(``))?__as_oak_string(__Oak_String(`https://news.ycombinator.com/item?id=`)+(story.objectID??null)):url)((url=(story.url??null))),__Oak_String(`company-news-link`)),h(Symbol.for('div'),[__Oak_String(`company-news-meta`)],[h(Symbol.for('span'),[__Oak_String(`company-news-date`)],[(__oak_js_new(Date,(story.created_at??null)).toLocaleDateString)()]),__Oak_String(` · `),h(Symbol.for('span'),[__Oak_String(`company-news-points`)],[(story.points??null),((__oak_cond)=>__oak_eq(__oak_cond,1)?__Oak_String(` point`):__Oak_String(` points`))((story.points??null))]),__Oak_String(` · `),h(Symbol.for('span'),[__Oak_String(`company-news-comments`)],[(story.num_comments??null),((__oak_cond)=>__oak_eq(__oak_cond,1)?__Oak_String(` comment`):__Oak_String(` comments`))((story.num_comments??null))])])])})))]))((news=__oak_acc((State.news??null),__oak_obj_key((id))))):null)(expanded__oak_qm),((__oak_cond)=>__oak_eq(__oak_cond,true)?h(Symbol.for('div'),[__Oak_String(`loading`)],[__Oak_String(`loading...`)]):null)((__oak_left=>__oak_left===false?false:__oak_and(__oak_left,((__oak_left=>__oak_left===true?true:__oak_or(__oak_left,__oak_eq(__oak_acc((State.news??null),__oak_obj_key((id))),null)))(__oak_eq((scraped.newsItems??null),null)))))(expanded__oak_qm)),((__oak_cond)=>__oak_eq(__oak_cond,true)?h(Symbol.for('button'),[__Oak_String(`more-like-this-button`)],({}),({click:function _(){return (((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(query,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.query):(__oak_assgn_tgt.query)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string((State.search??null)),__oak_js_default((company.long_description??null),(company.one_liner??null))),performSearch())}}),[__Oak_String(`More like this company →`)]):null)(expanded__oak_qm)])])))()},CompanyList=function CompanyList(companies=null){return (h(Symbol.for('ul'),[__Oak_String(`search-results-list`)],(map(companies,function _(company=null){return h(Symbol.for('li'),[__Oak_String(`search-results-item`)],[Company(company)])}))))},render=function render(){return (((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(className,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.className):(__oak_assgn_tgt.className)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string((document.body??null)),(State.colorscheme??null)),(r.update)(h(Symbol.for('div'),[__Oak_String(`app`)],[h(Symbol.for('header'),[],[h(Symbol.for('a'),[__Oak_String(`logo`)],({href:__Oak_String(`/`)}),({}),[__Oak_String(`YC Vibe Check`),h(Symbol.for('span'),[__Oak_String(`logo-subtitle`),__Oak_String(`desktop`)],[__Oak_String(`: What's everybody up to?`)])]),h(Symbol.for('nav'),[],[h(Symbol.for('button'),[__Oak_String(`colorscheme-button`),__as_oak_string(__Oak_String(`colorscheme-`)+(State.colorscheme??null))],({title:((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(`light`))?__Oak_String(`Dark mode`):__oak_eq(__oak_cond,__Oak_String(`dark`))?__Oak_String(`Light mode`):null)((State.colorscheme??null))}),({click:function _(){return (toggleColorScheme(),render())}}),[]),h(Symbol.for('button'),[__Oak_String(`about-button`)],({}),({click:function _(){return (((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(showWelcome__oak_qm,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.showWelcome__oak_qm):(__oak_assgn_tgt.showWelcome__oak_qm)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(State),true),(localStorage.removeItem)(__Oak_String(`should_show_welcome`)),render())}}),[__Oak_String(`about`)]),Link(__Oak_String(`github`),__Oak_String(`https://github.com/thesephist/ycvibecheck`),__Oak_String(`github-button`))])]),h(Symbol.for('main'),[((__oak_cond)=>__oak_eq(__oak_cond,true)?WelcomeMessage():null)((State.showWelcome__oak_qm??null)),h(Symbol.for('form'),[__Oak_String(`search-form`)],({}),({submit:function _(evt=null){return ((evt.preventDefault)(),performSearch())}}),[h(Symbol.for('div'),[__Oak_String(`search-input-row`)],[h(Symbol.for('div'),[__Oak_String(`search-autocomplete-group`)],[h(Symbol.for('input'),[__Oak_String(`search-input`)],({type:__Oak_String(`text`),value:((State.search??null).query??null),placeholder:__Oak_String(`Name a company or pitch an idea...`),autofocus:true}),({input:function _(evt=null){return (((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(query,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.query):(__oak_assgn_tgt.query)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string((State.search??null)),((evt.target??null).value??null)),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(idx,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.idx):(__oak_assgn_tgt.idx)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string((State.autocomplete??null)),0),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(suggestions,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.suggestions):(__oak_assgn_tgt.suggestions)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string((State.autocomplete??null)),take((search.autocomplete)(((State.search??null).query??null)),MaxAutocompletes)),render())},focus:function _(){return (((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(show__oak_qm,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.show__oak_qm):(__oak_assgn_tgt.show__oak_qm)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string((State.autocomplete??null)),true),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(idx,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.idx):(__oak_assgn_tgt.idx)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string((State.autocomplete??null)),0),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(suggestions,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.suggestions):(__oak_assgn_tgt.suggestions)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string((State.autocomplete??null)),take((search.autocomplete)(((State.search??null).query??null)),MaxAutocompletes)),render())},blur:function _(){return (wait(0.1,function _(){return (((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(show__oak_qm,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.show__oak_qm):(__oak_assgn_tgt.show__oak_qm)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string((State.autocomplete??null)),false),render())}))},keydown:function _(evt=null){return ((__oak_cond)=>__oak_eq(__oak_cond,[__Oak_String(`Enter`),__Oak_Empty])?((evt.preventDefault)(),((__oak_cond)=>__oak_eq(__oak_cond,true)?((selectedSuggestion)=>((selectedSuggestion=__oak_acc(((State.autocomplete??null).suggestions??null),__oak_obj_key(((((State.autocomplete??null).idx??null)-1))))),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(query,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.query):(__oak_assgn_tgt.query)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string((State.search??null)),suggestionString(selectedSuggestion))))():null)((__oak_left=>__oak_left===false?false:__oak_and(__oak_left,!__oak_eq(((State.autocomplete??null).idx??null),0)))(autocompleteVisible__oak_qm())),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(show__oak_qm,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.show__oak_qm):(__oak_assgn_tgt.show__oak_qm)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string((State.autocomplete??null)),false),performSearch()):__oak_eq(__oak_cond,[__Oak_String(`Escape`),__Oak_Empty])?((evt.preventDefault)(),((evt.target??null).blur)()):__oak_eq(__oak_cond,[__Oak_String(`ArrowUp`),__Oak_Empty])?((__oak_cond)=>__oak_eq(__oak_cond,true)?((MaxIdx,suggs)=>((evt.preventDefault)(),(suggs=((State.autocomplete??null).suggestions??null)),(MaxIdx=__as_oak_string(len(suggs)+1)),((__oak_cond)=>__oak_eq(__oak_cond,true)?(((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(idx,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.idx):(__oak_assgn_tgt.idx)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string((State.autocomplete??null)),((__as_oak_string((((State.autocomplete??null).idx??null)-1)+MaxIdx))%MaxIdx))):null)((len(suggs)>0)),render()))():null)(autocompleteVisible__oak_qm()):__oak_eq(__oak_cond,[__Oak_String(`Tab`),true])?((__oak_cond)=>__oak_eq(__oak_cond,true)?((MaxIdx,suggs)=>((evt.preventDefault)(),(suggs=((State.autocomplete??null).suggestions??null)),(MaxIdx=__as_oak_string(len(suggs)+1)),((__oak_cond)=>__oak_eq(__oak_cond,true)?(((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(idx,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.idx):(__oak_assgn_tgt.idx)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string((State.autocomplete??null)),((__as_oak_string((((State.autocomplete??null).idx??null)-1)+MaxIdx))%MaxIdx))):null)((len(suggs)>0)),render()))():null)(autocompleteVisible__oak_qm()):__oak_eq(__oak_cond,[__Oak_String(`ArrowDown`),__Oak_Empty])?((__oak_cond)=>__oak_eq(__oak_cond,true)?((MaxIdx,suggs)=>((evt.preventDefault)(),(suggs=((State.autocomplete??null).suggestions??null)),(MaxIdx=__as_oak_string(len(suggs)+1)),((__oak_cond)=>__oak_eq(__oak_cond,true)?(((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(idx,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.idx):(__oak_assgn_tgt.idx)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string((State.autocomplete??null)),((__as_oak_string(((State.autocomplete??null).idx??null)+1))%MaxIdx))):null)((len(suggs)>0)),render()))():null)(autocompleteVisible__oak_qm()):__oak_eq(__oak_cond,[__Oak_String(`Tab`),false])?((__oak_cond)=>__oak_eq(__oak_cond,true)?((MaxIdx,suggs)=>((evt.preventDefault)(),(suggs=((State.autocomplete??null).suggestions??null)),(MaxIdx=__as_oak_string(len(suggs)+1)),((__oak_cond)=>__oak_eq(__oak_cond,true)?(((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(idx,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.idx):(__oak_assgn_tgt.idx)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string((State.autocomplete??null)),((__as_oak_string(((State.autocomplete??null).idx??null)+1))%MaxIdx))):null)((len(suggs)>0)),render()))():null)(autocompleteVisible__oak_qm()):null)([(evt.key??null),(evt.shiftKey??null)])}}),[]),h(Symbol.for('div'),[__Oak_String(`search-autocomplete`),((__oak_cond)=>__oak_eq(__oak_cond,true)?__Oak_String(`show`):__Oak_String(`hide`))(((State.autocomplete??null).show__oak_qm??null))],(map(((State.autocomplete??null).suggestions??null),function _(sugg=null,i=null){return ((desc,name)=>(([name=null,desc=null]=sugg),h(Symbol.for('div'),[__Oak_String(`autocomplete-suggestion`),((__oak_cond)=>__oak_eq(__oak_cond,i)?__Oak_String(`selected`):__Oak_String(``))((((State.autocomplete??null).idx??null)-1))],({}),({click:function _(evt=null){return (((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(query,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.query):(__oak_assgn_tgt.query)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string((State.search??null)),suggestionString(sugg)),performSearch())}}),[h(Symbol.for('span'),[__Oak_String(`autocomplete-suggestion-name`)],[name]),h(Symbol.for('span'),[__Oak_String(`autocomplete-suggestion-desc`)],[desc])])))()})))]),h(Symbol.for('button'),[__Oak_String(`search-button`)],({title:__Oak_String(`Submit search`)}),[__Oak_String(`Search`)])]),h(Symbol.for('div'),[__Oak_String(`search-filter-row`)],[h(Symbol.for('label'),[__Oak_String(`search-filter-batch`)],[h(Symbol.for('select'),[],({}),({change:function _(evt=null){return ((batch)=>(((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(batch,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.batch):(__oak_assgn_tgt.batch)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string((State.search??null)),((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(``))?null:batch)((batch=((evt.target??null).value??null)))),performSearch()))()}}),((allBatches,batches)=>((allBatches=h(Symbol.for('option'),[],({value:__Oak_String(``),selected:__oak_eq(null,((State.search??null).batch??null))}),[__Oak_String(`All batches`)])),(batches=map(Batches,function _(batch=null){return (h(Symbol.for('option'),[],({value:batch,selected:__oak_eq(batch,((State.search??null).batch??null))}),[batch]))})),append([allBatches],batches)))())]),h(Symbol.for('label'),[__Oak_String(`search-filter-active`)],[h(Symbol.for('input'),[],({type:__Oak_String(`checkbox`),checked:((State.search??null).show_inactive??null)}),({change:function _(evt=null){return (((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(show_inactive,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.show_inactive):(__oak_assgn_tgt.show_inactive)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string((State.search??null)),((evt.target??null).checked??null)),performSearch())}}),[]),h(Symbol.for('span'),[__Oak_String(`desktop`)],[__Oak_String(`Show inactive companies`)]),h(Symbol.for('span'),[__Oak_String(`mobile`)],[__Oak_String(`Show inactives`)])])])]),h(Symbol.for('div'),[__Oak_String(`search-results`)],[((__oak_cond)=>__oak_eq(__oak_cond,true)?h(Symbol.for('div'),[__Oak_String(`loading`),__Oak_String(`loading-search`)],[__Oak_String(`loading...`)]):CompanyList((State.results??null)))(((State.search??null).loading__oak_qm??null))])]),h(Symbol.for('footer'),[],[h(Symbol.for('p'),[],[__Oak_String(`Project by `),Link(__Oak_String(`Linus`),__Oak_String(`https://thesephist.com`)),__Oak_String(`, powered by `),Link(__Oak_String(`Oak`),__Oak_String(`https://oaklang.org`)),__Oak_String(` and `),Link(__Oak_String(`Torus`),__Oak_String(`https://github.com/thesephist/torus`)),__Oak_String(`. Data sourced from `),Link(__Oak_String(`yc_company_scraper`),__Oak_String(`https://github.com/akshaybhalotia/yc_company_scraper`)),__Oak_String(` and semantic search made possible with `),Link(__Oak_String(`sentence-transformers`),__Oak_String(`https://www.sbert.net/`)),__Oak_String(`.`)]),h(Symbol.for('p'),[],[__Oak_String(`Last updated April 2022, up to W22 batch. `),Link(__Oak_String(`Submit an update.`),__Oak_String(`https://github.com/thesephist/ycvibecheck`))])])])))},((document.body??null).addEventListener)(__Oak_String(`keydown`),function _(evt=null){let searchInput;return ((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(`/`))?((__oak_cond)=>__oak_eq(__oak_cond,true)?((evt.preventDefault)(),(searchInput.focus)()):null)(!__oak_eq(null,(searchInput=(document.querySelector)(__Oak_String(`.search-input`))))):null)((evt.key??null))}),render(),performSearch(),({Batches,Company,CompanyList,ExternalLink,Label,LandingParams,Link,MaxAutocompletes,Renderer,State,Tag,WelcomeMessage,append,autocompleteVisible__oak_qm,cleanName,compact,contains__oak_qm,__oak_js_default,filter,h,hideWelcome,map,performSearch,println,r,render,search,suggestionString,take,toggleColorScheme,trim,trimEnd,trimStart,urlDisplayHostname})))()}),__oak_modularize(__Oak_String(`fmt`),function _(){return ((__oak_js_default,format,printf,println)=>(({println,__oak_js_default}=__oak_module_import(__Oak_String(`std`))),format=function format(raw=null,...values){return ((buf,key,sub,value,which)=>((which=0),(key=__Oak_String(``)),(buf=__Oak_String(``)),(value=__oak_js_default(__oak_acc(values,0),({}))),sub=function sub(idx=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(idx=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?((c)=>((c=__oak_acc(raw,__oak_obj_key((idx)))),((__oak_cond)=>__oak_eq(__oak_cond,0)?((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(`{`))?(which=1):__oak_push(buf,c))(c):__oak_eq(__oak_cond,1)?((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(`{`))?(which=2):(__oak_push(__oak_push(buf,__Oak_String(`{`)),c),(which=0)))(c):__oak_eq(__oak_cond,2)?((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(`}`))?((index)=>((index=int(key)),__oak_push(buf,string(((__oak_cond)=>__oak_eq(__oak_cond,__oak_eq(key,__Oak_String(``)))?__Oak_String(``):__oak_eq(__oak_cond,__oak_eq(index,null))?__oak_acc(value,__oak_obj_key((key))):__oak_acc(values,__oak_obj_key((index))))(true))),(key=__Oak_String(``)),(which=3)))():__oak_eq(__oak_cond,__Oak_String(` `))?null:__oak_eq(__oak_cond,__Oak_String(`	`))?null:(key=__as_oak_string(key+c)))(c):__oak_eq(__oak_cond,3)?((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(`}`))?(which=0):null)(c):null)(which),__oak_trampoline(__oak_trampolined_sub,__as_oak_string(idx+1))))():buf)((idx<len(raw)))}),__oak_resolve_trampoline(__oak_trampolined_sub,idx)))()},sub(0)))()},printf=function printf(raw=null,...values){return println(format(raw,...values))},({__oak_js_default,format,printf,println})))()}),__oak_modularize(__Oak_String(`sort`),function _(){return ((clone,__oak_js_default,id,map,sort,sort__oak_exclam)=>(({__oak_js_default,identity:id=null,map,clone}=__oak_module_import(__Oak_String(`std`))),sort__oak_exclam=function sort__oak_exclam(xs=null,pred=null){return ((partition,quicksort,vpred)=>((pred=__oak_js_default(pred,id)),(vpred=map(xs,pred)),partition=function partition(xs=null,lo=null,hi=null){return ((lsub,pivot,rsub,sub)=>((pivot=__oak_acc(vpred,__oak_obj_key((lo)))),lsub=function lsub(i=null){return ((__oak_trampolined_lsub)=>((__oak_trampolined_lsub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_lsub,__as_oak_string(i+1)):i)((__oak_acc(vpred,__oak_obj_key((i)))<pivot))}),__oak_resolve_trampoline(__oak_trampolined_lsub,i)))()},rsub=function rsub(j=null){return ((__oak_trampolined_rsub)=>((__oak_trampolined_rsub=function _(j=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_rsub,(j-1)):j)((__oak_acc(vpred,__oak_obj_key((j)))>pivot))}),__oak_resolve_trampoline(__oak_trampolined_rsub,j)))()},sub=function sub(i=null,j=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null,j=null){return ((i=lsub(i)),(j=rsub(j)),((__oak_cond)=>__oak_eq(__oak_cond,false)?j:((tmp,tmpPred)=>((tmp=__oak_acc(xs,__oak_obj_key((i)))),(tmpPred=__oak_acc(vpred,__oak_obj_key((i)))),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((i),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((i))]):(__oak_assgn_tgt[__oak_obj_key((i))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(xs),__oak_acc(xs,__oak_obj_key((j)))),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((j),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((j))]):(__oak_assgn_tgt[__oak_obj_key((j))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(xs),tmp),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((i),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((i))]):(__oak_assgn_tgt[__oak_obj_key((i))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(vpred),__oak_acc(vpred,__oak_obj_key((j)))),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((j),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((j))]):(__oak_assgn_tgt[__oak_obj_key((j))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(vpred),tmpPred),__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1),(j-1))))())((i<j)))}),__oak_resolve_trampoline(__oak_trampolined_sub,i,j)))()},sub(lo,hi)))()},quicksort=function quicksort(xs=null,lo=null,hi=null){return ((__oak_trampolined_quicksort)=>((__oak_trampolined_quicksort=function _(xs=null,lo=null,hi=null){return ((__oak_cond)=>__oak_eq(__oak_cond,0)?xs:__oak_eq(__oak_cond,1)?xs:((__oak_cond)=>__oak_eq(__oak_cond,false)?xs:((p)=>((p=partition(xs,lo,hi)),quicksort(xs,lo,p),__oak_trampoline(__oak_trampolined_quicksort,xs,__as_oak_string(p+1),hi)))())((lo<hi)))(len(xs))}),__oak_resolve_trampoline(__oak_trampolined_quicksort,xs,lo,hi)))()},quicksort(xs,0,(len(xs)-1))))()},sort=function sort(xs=null,pred=null){return sort__oak_exclam(clone(xs),pred)},({clone,__oak_js_default,id,map,sort,sort__oak_exclam})))()}),__oak_modularize(__Oak_String(`std`),function _(){return ((_asPredicate,_baseIterator,_hToN,_nToH,append,clamp,clone,compact,contains__oak_qm,debounce,__oak_js_default,each,entries,every,filter,find,first,flatten,fromHex,identity,indexOf,join,last,loop,map,merge,once,partition,println,range,reduce,reverse,slice,some,stdin,take,takeLast,toHex,uniq,values,zip)=>(identity=function identity(x=null){return x},_baseIterator=function _baseIterator(v=null){return ((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('string'))?__Oak_String(``):__oak_eq(__oak_cond,Symbol.for('list'))?[]:__oak_eq(__oak_cond,Symbol.for('object'))?({}):null)(type(v))},_asPredicate=function _asPredicate(pred=null){return ((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('atom'))?((prop)=>((prop=string(pred)),function _(x=null){return __oak_acc(x,__oak_obj_key((prop)))}))():__oak_eq(__oak_cond,Symbol.for('string'))?function _(x=null){return __oak_acc(x,__oak_obj_key((pred)))}:__oak_eq(__oak_cond,Symbol.for('int'))?function _(x=null){return __oak_acc(x,__oak_obj_key((pred)))}:pred)(type(pred))},__oak_js_default=function __oak_js_default(x=null,base=null){return ((__oak_cond)=>__oak_eq(__oak_cond,null)?base:x)(x)},(_nToH=__Oak_String(`0123456789abcdef`)),toHex=function toHex(n=null){return ((sub)=>(sub=function sub(p=null,acc=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(p=null,acc=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__as_oak_string(__oak_acc(_nToH,__oak_obj_key((p)))+acc):__oak_trampoline(__oak_trampolined_sub,int((p/16)),__as_oak_string(__oak_acc(_nToH,__oak_obj_key(((p%16))))+acc)))((p<16))}),__oak_resolve_trampoline(__oak_trampolined_sub,p,acc)))()},sub(int(n),__Oak_String(``))))()},(_hToN=({0:0,1:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,a:10,A:10,b:11,B:11,c:12,C:12,d:13,D:13,e:14,E:14,f:15,F:15})),fromHex=function fromHex(s=null){return ((sub)=>(sub=function sub(i=null,acc=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null,acc=null){let next;return ((__oak_cond)=>__oak_eq(__oak_cond,__oak_eq(i,len(s)))?acc:__oak_eq(__oak_cond,!__oak_eq(null,(next=__oak_acc(_hToN,__oak_obj_key((__oak_acc(s,__oak_obj_key((i)))))))))?__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1),__as_oak_string((acc*16)+next)):null)(true)}),__oak_resolve_trampoline(__oak_trampolined_sub,i,acc)))()},sub(0,0)))()},clamp=function clamp(min=null,max=null,n=null,m=null){return ((n=((__oak_cond)=>__oak_eq(__oak_cond,true)?min:n)((n<min))),(m=((__oak_cond)=>__oak_eq(__oak_cond,true)?min:m)((m<min))),(m=((__oak_cond)=>__oak_eq(__oak_cond,true)?max:m)((m>max))),(n=((__oak_cond)=>__oak_eq(__oak_cond,true)?m:n)((n>m))),[n,m])},slice=function slice(xs=null,min=null,max=null){return ((sub)=>((min=__oak_js_default(min,0)),(max=__oak_js_default(max,len(xs))),([min=null,max=null]=clamp(0,len(xs),min,max)),sub=function sub(acc=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,max)?acc:__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,__oak_acc(xs,__oak_obj_key((i)))),__as_oak_string(i+1)))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i)))()},sub(_baseIterator(xs),min)))()},clone=function clone(x=null){return ((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('string'))?__as_oak_string(__Oak_String(``)+x):__oak_eq(__oak_cond,Symbol.for('list'))?slice(x):__oak_eq(__oak_cond,Symbol.for('object'))?reduce(keys(x),({}),function _(acc=null,key=null){return ((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((key),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((key))]):(__oak_assgn_tgt[__oak_obj_key((key))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(acc),__oak_acc(x,__oak_obj_key((key))))}):x)(type(x))},range=function range(start=null,end=null,step=null){return ((step=__oak_js_default(step,1)),((__oak_cond)=>__oak_eq(__oak_cond,true)?([start=null,end=null]=[0,start]):null)(__oak_eq(end,null)),((__oak_cond)=>__oak_eq(__oak_cond,0)?[]:((list,sub)=>((list=[]),((__oak_cond)=>__oak_eq(__oak_cond,true)?sub=function sub(n=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(n=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?(__oak_push(list,n),__oak_trampoline(__oak_trampolined_sub,__as_oak_string(n+step))):list)((n<end))}),__oak_resolve_trampoline(__oak_trampolined_sub,n)))()}:sub=function sub(n=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(n=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?(__oak_push(list,n),__oak_trampoline(__oak_trampolined_sub,__as_oak_string(n+step))):list)((n>end))}),__oak_resolve_trampoline(__oak_trampolined_sub,n)))()})((step>0)),sub(start)))())(step))},reverse=function reverse(xs=null){return ((sub)=>(sub=function sub(acc=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?acc:__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,__oak_acc(xs,__oak_obj_key((i)))),(i-1)))((i<0))}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i)))()},sub(_baseIterator(xs),(len(xs)-1))))()},map=function map(xs=null,f=null){return ((sub)=>((f=_asPredicate(f)),sub=function sub(acc=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?acc:__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,f(__oak_acc(xs,__oak_obj_key((i))),i)),__as_oak_string(i+1)))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i)))()},sub(_baseIterator(xs),0)))()},each=function each(xs=null,f=null){return ((sub)=>(sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?null:(f(__oak_acc(xs,__oak_obj_key((i))),i),__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1))))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},sub(0)))()},filter=function filter(xs=null,f=null){return ((sub)=>((f=_asPredicate(f)),sub=function sub(acc=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?acc:((x)=>(((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_push(acc,x):null)(f((x=__oak_acc(xs,__oak_obj_key((i)))),i)),__oak_trampoline(__oak_trampolined_sub,acc,__as_oak_string(i+1))))())(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i)))()},sub(_baseIterator(xs),0)))()},reduce=function reduce(xs=null,seed=null,f=null){return ((sub)=>(sub=function sub(acc=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?acc:__oak_trampoline(__oak_trampolined_sub,f(acc,__oak_acc(xs,__oak_obj_key((i))),i),__as_oak_string(i+1)))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i)))()},sub(seed,0)))()},flatten=function flatten(xs=null){return reduce(xs,[],append)},compact=function compact(xs=null){return filter(xs,function _(x=null){return !__oak_eq(x,null)})},some=function some(xs=null,pred=null){return ((pred=__oak_js_default(pred,identity)),reduce(xs,false,function _(acc=null,x=null,i=null){return (__oak_left=>__oak_left===true?true:__oak_or(__oak_left,pred(x,i)))(acc)}))},every=function every(xs=null,pred=null){return ((pred=__oak_js_default(pred,identity)),reduce(xs,true,function _(acc=null,x=null,i=null){return (__oak_left=>__oak_left===false?false:__oak_and(__oak_left,pred(x,i)))(acc)}))},append=function append(xs=null,ys=null){return reduce(ys,xs,function _(zs=null,y=null){return __oak_push(zs,y)})},join=function join(xs=null,ys=null){return append(clone(xs),ys)},zip=function zip(xs=null,ys=null,zipper=null){return ((max,sub)=>((zipper=__oak_js_default(zipper,function _(x=null,y=null){return [x,y]})),(max=((__oak_cond)=>__oak_eq(__oak_cond,true)?len(xs):len(ys))((len(xs)<len(ys)))),sub=function sub(acc=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,max)?acc:__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,zipper(__oak_acc(xs,__oak_obj_key((i))),__oak_acc(ys,__oak_obj_key((i))),i)),__as_oak_string(i+1)))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i)))()},sub([],0)))()},partition=function partition(xs=null,by=null){return ((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('int'))?reduce(xs,[],function _(acc=null,x=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,0)?__oak_push(acc,[x]):(__oak_push(__oak_acc(acc,__oak_obj_key(((len(acc)-1)))),x),acc))((i%by))}):__oak_eq(__oak_cond,Symbol.for('function'))?((last)=>((last=function _(){return null}),reduce(xs,[],function _(acc=null,x=null){return ((__oak_js_this)=>(((__oak_cond)=>__oak_eq(__oak_cond,last)?__oak_push(__oak_acc(acc,__oak_obj_key(((len(acc)-1)))),x):__oak_push(acc,[x]))((__oak_js_this=by(x))),(last=__oak_js_this),acc))()})))():null)(type(by))},uniq=function uniq(xs=null,pred=null){return ((last,sub,ys)=>((pred=__oak_js_default(pred,identity)),(ys=_baseIterator(xs)),(last=function _(){return null}),sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){let p;let x;return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?ys:((__oak_cond)=>__oak_eq(__oak_cond,last)?__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1)):(__oak_push(ys,x),(last=p),__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1))))((p=pred((x=__oak_acc(xs,__oak_obj_key((i))))))))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},sub(0)))()},first=function first(xs=null){return __oak_acc(xs,0)},last=function last(xs=null){return __oak_acc(xs,__oak_obj_key(((len(xs)-1))))},take=function take(xs=null,n=null){return slice(xs,0,n)},takeLast=function takeLast(xs=null,n=null){return slice(xs,(len(xs)-n))},find=function find(xs=null,pred=null){return ((sub)=>(sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?-1:((__oak_cond)=>__oak_eq(__oak_cond,true)?i:__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1)))(pred(__oak_acc(xs,__oak_obj_key((i))))))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},sub(0)))()},indexOf=function indexOf(xs=null,x=null){return ((sub)=>(sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?-1:((__oak_cond)=>__oak_eq(__oak_cond,x)?i:__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1)))(__oak_acc(xs,__oak_obj_key((i)))))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},sub(0)))()},contains__oak_qm=function contains__oak_qm(xs=null,x=null){return (indexOf(xs,x)>-1)},values=function values(obj=null){return map(keys(obj),function _(key=null){return __oak_acc(obj,__oak_obj_key((key)))})},entries=function entries(obj=null){return map(keys(obj),function _(key=null){return [key,__oak_acc(obj,__oak_obj_key((key)))]})},merge=function merge(...os){return ((__oak_cond)=>__oak_eq(__oak_cond,0)?null:reduce(os,__oak_acc(os,0),function _(acc=null,o=null){return (reduce(keys(o),acc,function _(root=null,k=null){return ((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((k),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((k))]):(__oak_assgn_tgt[__oak_obj_key((k))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(root),__oak_acc(o,__oak_obj_key((k))))}))}))(len(os))},once=function once(f=null){return ((called__oak_qm)=>((called__oak_qm=false),function _(...args){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?((called__oak_qm=true),f(...args)):null)(!called__oak_qm)}))()},loop=function loop(max=null,f=null){return ((breaker,broken,ret,sub)=>(((__oak_cond)=>__oak_eq(__oak_cond,true)?([max=null,f=null]=[-1,max]):null)(__oak_eq(f,null)),(max=__oak_js_default(max,-1)),(ret=null),(broken=false),breaker=function breaker(x=null){return ((ret=x),(broken=true))},sub=function sub(count=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(count=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?((__oak_cond)=>__oak_eq(__oak_cond,broken)?ret:(f(count,breaker),__oak_trampoline(__oak_trampolined_sub,__as_oak_string(count+1))))(true):null)(!__oak_eq(count,max))}),__oak_resolve_trampoline(__oak_trampolined_sub,count)))()},sub(0)))()},debounce=function debounce(duration=null,firstCall=null,f=null){return ((dargs,debounced,target,waiting__oak_qm)=>(((__oak_cond)=>__oak_eq(__oak_cond,true)?([firstCall=null,f=null]=[Symbol.for('trailing'),firstCall]):null)(__oak_eq(f,null)),(dargs=null),(waiting__oak_qm=false),(target=(time()-duration)),debounced=function debounced(...args){return ((tcall)=>((tcall=time()),(dargs=args),((__oak_cond)=>__oak_eq(__oak_cond,true)?((__oak_cond)=>__oak_eq(__oak_cond,true)?((target=__as_oak_string(tcall+duration)),((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('leading'))?f(...dargs):__oak_eq(__oak_cond,Symbol.for('trailing'))?((waiting__oak_qm=true),wait((target-time()),function _(){return ((waiting__oak_qm=false),f(...dargs))})):null)(firstCall)):((timeout)=>((waiting__oak_qm=true),(timeout=(target-tcall)),(target=__as_oak_string(target+duration)),wait(timeout,function _(){return ((waiting__oak_qm=false),f(...dargs))})))())((target<=tcall)):null)(!waiting__oak_qm)))()}))()},stdin=function stdin(){return ((file)=>((file=__Oak_String(``)),loop(function _(__oak_empty_ident0=null,__oak_js_break=null){return ((evt)=>((evt=input()),__oak_push(file,(evt.data??null)),((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('error'))?__oak_js_break(file):__oak_push(file,__Oak_String(`
`)))((evt.type??null))))()})))()},println=function println(...xs){return ((__oak_cond)=>__oak_eq(__oak_cond,0)?print(__Oak_String(`
`)):((out)=>((out=reduce(slice(xs,1),string(__oak_acc(xs,0)),function _(acc=null,x=null){return (__as_oak_string(__as_oak_string(acc+__Oak_String(` `))+string(x)))})),print(__as_oak_string(out+__Oak_String(`
`)))))())(len(xs))},({_asPredicate,_baseIterator,_hToN,_nToH,append,clamp,clone,compact,contains__oak_qm,debounce,__oak_js_default,each,entries,every,filter,find,first,flatten,fromHex,identity,indexOf,join,last,loop,map,merge,once,partition,println,range,reduce,reverse,slice,some,stdin,take,takeLast,toHex,uniq,values,zip})))()}),__oak_modularize(__Oak_String(`str`),function _(){return ((_extend,_matchesAt__oak_qm,_replaceNonEmpty,_splitNonEmpty,_trimEndNonEmpty,_trimEndSpace,_trimStartNonEmpty,_trimStartSpace,checkRange,contains__oak_qm,cut,__oak_js_default,digit__oak_qm,endsWith__oak_qm,indexOf,join,letter__oak_qm,lower,lower__oak_qm,padEnd,padStart,reduce,replace,slice,space__oak_qm,split,startsWith__oak_qm,take,takeLast,trim,trimEnd,trimStart,upper,upper__oak_qm,word__oak_qm)=>(({__oak_js_default,slice,take,takeLast,reduce}=__oak_module_import(__Oak_String(`std`))),checkRange=function checkRange(lo=null,hi=null){let checker;return checker=function checker(c=null){return ((p)=>((p=codepoint(c)),(__oak_left=>__oak_left===false?false:__oak_and(__oak_left,(p<=hi)))((lo<=p))))()}},upper__oak_qm=function upper__oak_qm(c=null){return (__oak_left=>__oak_left===false?false:__oak_and(__oak_left,(c<=__Oak_String(`Z`))))((c>=__Oak_String(`A`)))},lower__oak_qm=function lower__oak_qm(c=null){return (__oak_left=>__oak_left===false?false:__oak_and(__oak_left,(c<=__Oak_String(`z`))))((c>=__Oak_String(`a`)))},digit__oak_qm=function digit__oak_qm(c=null){return (__oak_left=>__oak_left===false?false:__oak_and(__oak_left,(c<=__Oak_String(`9`))))((c>=__Oak_String(`0`)))},space__oak_qm=function space__oak_qm(c=null){return ((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(` `))?true:__oak_eq(__oak_cond,__Oak_String(`	`))?true:__oak_eq(__oak_cond,__Oak_String(`
`))?true:__oak_eq(__oak_cond,__Oak_String(``))?true:__oak_eq(__oak_cond,__Oak_String(``))?true:false)(c)},letter__oak_qm=function letter__oak_qm(c=null){return (__oak_left=>__oak_left===true?true:__oak_or(__oak_left,lower__oak_qm(c)))(upper__oak_qm(c))},word__oak_qm=function word__oak_qm(c=null){return (__oak_left=>__oak_left===true?true:__oak_or(__oak_left,digit__oak_qm(c)))(letter__oak_qm(c))},join=function join(strings=null,joiner=null){return ((joiner=__oak_js_default(joiner,__Oak_String(``))),((__oak_cond)=>__oak_eq(__oak_cond,0)?__Oak_String(``):reduce(slice(strings,1),__oak_acc(strings,0),function _(a=null,b=null){return __as_oak_string(__as_oak_string(a+joiner)+b)}))(len(strings)))},startsWith__oak_qm=function startsWith__oak_qm(s=null,prefix=null){return __oak_eq(take(s,len(prefix)),prefix)},endsWith__oak_qm=function endsWith__oak_qm(s=null,suffix=null){return __oak_eq(takeLast(s,len(suffix)),suffix)},_matchesAt__oak_qm=function _matchesAt__oak_qm(s=null,substr=null,idx=null){return ((__oak_cond)=>__oak_eq(__oak_cond,0)?true:__oak_eq(__oak_cond,1)?__oak_eq(__oak_acc(s,__oak_obj_key((idx))),substr):((max,sub)=>((max=len(substr)),sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,max)?true:((__oak_cond)=>__oak_eq(__oak_cond,__oak_acc(substr,__oak_obj_key((i))))?__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1)):false)(__oak_acc(s,__oak_obj_key((__as_oak_string(idx+i))))))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},sub(0)))())(len(substr))},indexOf=function indexOf(s=null,substr=null){return ((max,sub)=>((max=(len(s)-len(substr))),sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?i:((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1)):-1)((i<max)))(_matchesAt__oak_qm(s,substr,i))}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},sub(0)))()},contains__oak_qm=function contains__oak_qm(s=null,substr=null){return (indexOf(s,substr)>=0)},cut=function cut(s=null,sep=null){let idx;return ((__oak_cond)=>__oak_eq(__oak_cond,-1)?[s,__Oak_String(``)]:[slice(s,0,idx),slice(s,__as_oak_string(idx+len(sep)))])((idx=indexOf(s,sep)))},lower=function lower(s=null){return reduce(s,__Oak_String(``),function _(acc=null,c=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_push(acc,char(__as_oak_string(codepoint(c)+32))):__oak_push(acc,c))(upper__oak_qm(c))})},upper=function upper(s=null){return reduce(s,__Oak_String(``),function _(acc=null,c=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_push(acc,char((codepoint(c)-32))):__oak_push(acc,c))(lower__oak_qm(c))})},_replaceNonEmpty=function _replaceNonEmpty(s=null,old=null,__oak_js_new=null){return ((lnew,lold,sub)=>((lold=len(old)),(lnew=len(__oak_js_new)),sub=function sub(acc=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_sub,__as_oak_string(__as_oak_string(slice(acc,0,i)+__oak_js_new)+slice(acc,__as_oak_string(i+lold))),__as_oak_string(i+lnew)):((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_sub,acc,__as_oak_string(i+1)):acc)((i<len(acc))))(_matchesAt__oak_qm(acc,old,i))}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i)))()},sub(s,0)))()},replace=function replace(s=null,old=null,__oak_js_new=null){return ((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(``))?s:_replaceNonEmpty(s,old,__oak_js_new))(old)},_splitNonEmpty=function _splitNonEmpty(s=null,sep=null){return ((coll,lsep,sub)=>((coll=[]),(lsep=len(sep)),sub=function sub(acc=null,i=null,last=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null,last=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?(__oak_push(coll,slice(acc,last,i)),__oak_trampoline(__oak_trampolined_sub,acc,__as_oak_string(i+lsep),__as_oak_string(i+lsep))):((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_sub,acc,__as_oak_string(i+1),last):__oak_push(coll,slice(acc,last)))((i<len(acc))))(_matchesAt__oak_qm(acc,sep,i))}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i,last)))()},sub(s,0,0)))()},split=function split(s=null,sep=null){return ((__oak_cond)=>__oak_eq(__oak_cond,null)?reduce(s,[],function _(acc=null,c=null){return __oak_push(acc,c)}):__oak_eq(__oak_cond,__Oak_String(``))?reduce(s,[],function _(acc=null,c=null){return __oak_push(acc,c)}):_splitNonEmpty(s,sep))(sep)},_extend=function _extend(pad=null,n=null){return ((part,sub,times)=>((times=int((n/len(pad)))),(part=(n%len(pad))),sub=function sub(base=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(base=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,0)?__oak_push(base,slice(pad,0,part)):__oak_trampoline(__oak_trampolined_sub,__oak_push(base,pad),(i-1)))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,base,i)))()},sub(__Oak_String(``),times)))()},padStart=function padStart(s=null,n=null,pad=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?s:__oak_push(_extend(pad,(n-len(s))),s))((len(s)>=n))},padEnd=function padEnd(s=null,n=null,pad=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?s:__as_oak_string(s+_extend(pad,(n-len(s)))))((len(s)>=n))},_trimStartSpace=function _trimStartSpace(s=null){return ((firstNonSpace,subStart)=>(subStart=function subStart(i=null){return ((__oak_trampolined_subStart)=>((__oak_trampolined_subStart=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_subStart,__as_oak_string(i+1)):i)(space__oak_qm(__oak_acc(s,__oak_obj_key((i)))))}),__oak_resolve_trampoline(__oak_trampolined_subStart,i)))()},(firstNonSpace=subStart(0)),slice(s,firstNonSpace)))()},_trimStartNonEmpty=function _trimStartNonEmpty(s=null,prefix=null){return ((idx,lpref,max,sub)=>((max=len(s)),(lpref=len(prefix)),sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+lpref)):i)(_matchesAt__oak_qm(s,prefix,i)):i)((i<max))}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},(idx=sub(0)),slice(s,idx)))()},trimStart=function trimStart(s=null,prefix=null){return ((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(``))?s:__oak_eq(__oak_cond,null)?_trimStartSpace(s):_trimStartNonEmpty(s,prefix))(prefix)},_trimEndSpace=function _trimEndSpace(s=null){return ((lastNonSpace,subEnd)=>(subEnd=function subEnd(i=null){return ((__oak_trampolined_subEnd)=>((__oak_trampolined_subEnd=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_subEnd,(i-1)):i)(space__oak_qm(__oak_acc(s,__oak_obj_key((i)))))}),__oak_resolve_trampoline(__oak_trampolined_subEnd,i)))()},(lastNonSpace=subEnd((len(s)-1))),slice(s,0,__as_oak_string(lastNonSpace+1))))()},_trimEndNonEmpty=function _trimEndNonEmpty(s=null,suffix=null){return ((idx,lsuf,sub)=>((lsuf=len(suffix)),sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_sub,(i-lsuf)):i)(_matchesAt__oak_qm(s,suffix,(i-lsuf))):i)((i>-1))}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},(idx=sub(len(s))),slice(s,0,idx)))()},trimEnd=function trimEnd(s=null,suffix=null){return ((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(``))?s:__oak_eq(__oak_cond,null)?_trimEndSpace(s):_trimEndNonEmpty(s,suffix))(suffix)},trim=function trim(s=null,part=null){return trimEnd(trimStart(s,part),part)},({_extend,_matchesAt__oak_qm,_replaceNonEmpty,_splitNonEmpty,_trimEndNonEmpty,_trimEndSpace,_trimStartNonEmpty,_trimStartSpace,checkRange,contains__oak_qm,cut,__oak_js_default,digit__oak_qm,endsWith__oak_qm,indexOf,join,letter__oak_qm,lower,lower__oak_qm,padEnd,padStart,reduce,replace,slice,space__oak_qm,split,startsWith__oak_qm,take,takeLast,trim,trimEnd,trimStart,upper,upper__oak_qm,word__oak_qm})))()}),(__Oak_Import_Aliases=({})),__oak_module_import(__Oak_String(`src/app.js.oak`)))