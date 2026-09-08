/* 常用英文单词表，用于生成可读性更好的随机邮箱前缀 */
const WORDS = [
	'apple', 'amber', 'angel', 'arrow', 'autumn', 'bamboo', 'banana', 'beacon', 'bear', 'bird',
	'blossom', 'brave', 'bread', 'breeze', 'bright', 'brook', 'bubble', 'cactus', 'camel', 'candle',
	'canyon', 'cedar', 'cherry', 'cloud', 'clover', 'cobalt', 'comet', 'coral', 'cosmic', 'cotton',
	'crane', 'crimson', 'crystal', 'daisy', 'dawn', 'delta', 'desert', 'dolphin', 'dragon', 'dream',
	'eagle', 'echo', 'ember', 'emerald', 'falcon', 'fern', 'firefly', 'flame', 'flint', 'flora',
	'forest', 'fossil', 'fox', 'frost', 'garden', 'gentle', 'ginger', 'glacier', 'goose', 'granite',
	'grape', 'grove', 'harbor', 'harvest', 'hazel', 'hedge', 'hollow', 'honey', 'horizon', 'ivory',
	'jade', 'jaguar', 'jasmine', 'jungle', 'juniper', 'kitten', 'koala', 'lagoon', 'lake', 'lantern',
	'lattice', 'lemon', 'lily', 'linen', 'lotus', 'lumen', 'lunar', 'maple', 'marble', 'meadow',
	'metal', 'mint', 'misty', 'mosaic', 'moss', 'mountain', 'nectar', 'nimbus', 'nomad', 'noble',
	'oak', 'oasis', 'ocean', 'olive', 'onyx', 'opal', 'orbit', 'orchid', 'otter', 'panda',
	'pebble', 'pepper', 'petal', 'phoenix', 'piano', 'pine', 'pixel', 'plum', 'poppy', 'prairie',
	'quartz', 'quill', 'rabbit', 'rapid', 'raven', 'reef', 'ribbon', 'river', 'rocket', 'rose',
	'rustic', 'saffron', 'sage', 'sailor', 'salmon', 'sand', 'sapphire', 'satin', 'scarlet', 'shadow',
	'silk', 'silver', 'sky', 'solace', 'spring', 'spruce', 'star', 'stone', 'storm', 'summer',
	'sun', 'syrup', 'thunder', 'tiger', 'timber', 'topaz', 'tulip', 'tundra', 'vanilla', 'velvet',
	'violet', 'walnut', 'whisper', 'willow', 'window', 'winter', 'wolf', 'wonder', 'zebra', 'zenith',
];

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';

function pick(list) {
	return list[Math.floor(Math.random() * list.length)];
}

function randomDigits(len) {
	let s = '';
	for (let i = 0; i < len; i++) s += pick(DIGITS);
	return s;
}

/** 随机字符前缀：首字母为字母，其余为字母+数字，长度 len */
export function randomChars(len = 8) {
	let s = pick(LETTERS);
	for (let i = 1; i < len; i++) s += pick(LETTERS + DIGITS);
	return s;
}

/** 随机单词前缀 */
export function randomWord() {
	return pick(WORDS);
}

/**
 * 单词组合前缀：随机「单词+数字」或「单词.单词」，单词在前或在后
 * @param {number} len 数字位数（单词+数字时生效）
 */
export function randomWordCombo(len = 8) {
	if (Math.random() < 0.5) {
		const word = randomWord();
		const digits = randomDigits(len);
		return Math.random() < 0.5 ? word + digits : digits + word;
	}
	let a = randomWord();
	let b = randomWord();
	while (b === a) b = randomWord();
	return Math.random() < 0.5 ? `${a}.${b}` : `${b}.${a}`;
}
