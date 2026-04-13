(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.PracticeMaker = factory());
})(this, (function () { 'use strict';

	class PracticeMaker {
		constructor() {
			console.log('Making Practices');
		}
	}

	return PracticeMaker;

}));
//# sourceMappingURL=practice.bundle.js.map
