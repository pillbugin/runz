console.log("Starting Queue Worker...");

const interval = Math.floor(Math.random() * 3) + 1;
setInterval(() => {
	console.log("Processing background job");
}, interval * 1000);
