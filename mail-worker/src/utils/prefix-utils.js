const prefixMode = {
	WORD: 'word',
	RANDOM: 'random'
};

const firstChars = 'abcdefghijklmnopqrstuvwxyz';
const allChars = 'abcdefghijklmnopqrstuvwxyz0123456789';

const adjectives = [
	'amber', 'ancient', 'aqua', 'autumn', 'azure', 'bliss', 'brave', 'bright', 'calm', 'cedar',
	'clear', 'cloud', 'cool', 'coral', 'crisp', 'dawn', 'deep', 'ember', 'fancy', 'fine',
	'fresh', 'gentle', 'glad', 'gold', 'grand', 'green', 'happy', 'ivory', 'jade', 'jolly',
	'kind', 'lively', 'lucky', 'mellow', 'misty', 'modern', 'moon', 'neat', 'nova', 'olive',
	'pearl', 'prime', 'quick', 'quiet', 'rapid', 'royal', 'shiny', 'silver', 'smart', 'solar',
	'spring', 'stellar', 'sunny', 'swift', 'tidy', 'urban', 'velvet', 'vivid', 'warm', 'young'
];

const nouns = [
	'anchor', 'apple', 'bamboo', 'bay', 'beacon', 'bear', 'bird', 'bloom', 'breeze', 'brook',
	'cabin', 'canyon', 'castle', 'cedar', 'cherry', 'cloud', 'comet', 'coral', 'creek', 'daisy',
	'delta', 'dream', 'drift', 'falcon', 'field', 'firefly', 'flower', 'forest', 'garden', 'glade',
	'glow', 'grove', 'harbor', 'horizon', 'island', 'lake', 'leaf', 'light', 'lotus', 'meadow',
	'morning', 'mountain', 'oasis', 'ocean', 'panda', 'pebble', 'phoenix', 'pine', 'planet', 'pond',
	'rabbit', 'rain', 'reef', 'river', 'rocket', 'rose', 'shadow', 'shore', 'sky', 'snow',
	'spark', 'sprout', 'star', 'stone', 'stream', 'sunrise', 'sunset', 'thunder', 'tiger', 'trail',
	'tree', 'valley', 'violet', 'water', 'willow', 'wind', 'wood', 'zephyr'
];

function randomInt(max) {
	const bytes = new Uint32Array(1);
	crypto.getRandomValues(bytes);
	return bytes[0] % max;
}

function randomItem(list) {
	return list[randomInt(list.length)];
}

function normalizeMode(mode) {
	return mode === prefixMode.RANDOM ? prefixMode.RANDOM : prefixMode.WORD;
}

function randomString(length = 8) {
	const size = Math.max(1, Number(length) || 8);
	let result = firstChars[randomInt(firstChars.length)];

	for (let i = 1; i < size; i++) {
		result += allChars[randomInt(allChars.length)];
	}

	return result;
}

function randomWord(minLength = 1, variant = 0) {
	const targetLength = Math.max(1, Number(minLength) || 1);
	const parts = [randomItem(adjectives), randomItem(nouns)];

	if (variant > 10 || targetLength > 12) {
		parts.push(randomItem(nouns));
	}

	let result = parts.join('');

	while (result.length < targetLength) {
		result += randomItem(nouns);
	}

	return result;
}

export default {
	prefixMode,
	normalizeMode,
	randomString,
	randomWord
};
