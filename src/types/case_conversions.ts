export function camelify(snake: string) {
	return snake.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

export function pascalify(snake: string) {
	const camel = camelify(snake);
	return camel[0].toUpperCase() + camel.slice(1);
}

export function snakeify(camel: string) {
	return camel.replace(/[A-Z]/g, (g) => `_${g.toLowerCase()}`);
}
