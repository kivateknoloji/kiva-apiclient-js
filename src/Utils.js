import SHA256 from "crypto-js/sha256";
import EncBase64 from "crypto-js/enc-base64";
import { isBrowser } from "browser-or-node";

export const base64URLEncode = function(str){
	return str.toString(EncBase64)
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '');
};

const byteToHex = function(byte){
	return ('0' + byte.toString(16)).slice(-2);
};

export const randomString = function(len = 64){
	if(isBrowser && window.crypto){
		let data = new Uint8Array(len / 2);
		crypto.getRandomValues(data);
		return Array.from(data, byteToHex).join("");
	}
	else{
		let data = '';
		const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		const charactersLength = characters.length;
		for ( let i = 0; i < length; i++ ) {
			data += characters.charAt(Math.floor(Math.random() * charactersLength));
		}
		return data;
	}
};

const isEmpty = function(val){
	return val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
};

const each = function(array, fn, scope){
	if(isEmpty(array, true)){
		return;
	}
	if(!Array.isArray(array)){
		array = [array];
	}
	for(let i = 0, len = array.length; i < len; i++){
		if(fn.call(scope || array[i], array[i], i, array) === false){
			return i;
		}
	}
};

const iterate = function(obj, fn, scope){
	if(isEmpty(obj)){
		return;
	}
	if(Array.isArray(obj)){
		obj.forEach(fn.bind(scope));
	}
	else if(typeof obj == 'object'){
		for(let prop in obj){
			if(obj.hasOwnProperty(prop)){
				if(fn.call(scope || obj, prop, obj[prop], obj) === false){
					return;
				}
			}
		}
	}
};

export const urlEncode = function(o, pre){
	let empty,
		buf = [],
		e = function(val){
			return typeof(val) === 'object' ? encodeURIComponent(JSON.stringify(val)) : encodeURIComponent(val);
		},
		isDate = function(val){
			return (val instanceof Date);
		};

	iterate(o, function(key, item){
		empty = isEmpty(item);
		each(empty ? key : item, function(val){
			let v = '';
			if(val === false || val === true){
				v = val ? 1 : 0;
			}
			else if(isDate(val)){
				v = encode(val).replace(/"/g, '');
			}
			else if(!isEmpty(val) && (val !== key || !empty)){
				v = e(val);
			}
			buf.push('&', e(key), '=', v);
		});
	});

	if(!pre){
		buf.shift();
		pre = '';
	}
	return pre + buf.join('');
};
