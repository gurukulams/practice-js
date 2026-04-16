'use strict';

export default class PracticeMaker {
	constructor(contentRoot) {
		contentRoot.innerHTML = 'Making Practices';
	}

	setQuestions(_questions) {
		contentRoot.innerHTML = _questions;
	}

}