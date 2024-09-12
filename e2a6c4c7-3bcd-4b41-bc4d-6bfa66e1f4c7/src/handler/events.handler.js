// fs - path
const { readdirSync, statSync } = require("node:fs");
const { join } = require("node:path");

// handler
module.exports = (client) => {

    // function to load events recursively
    const loadEvents = (dir) => {

        // all files in the events folder
        const files = readdirSync(dir);
        for (const file of files) {

            // folder files
            const filePath = join(dir, file);
            const stats = statSync(filePath);

            // if it is a directory, call the function recursively
            if (stats.isDirectory()) {
                loadEvents(filePath);
            };

            // if it is a .js file, load the event
            if (file.endsWith(".js")) {

                const event = require(filePath);
                if (event.once) {
                    client.once(event.name, (...args) => event.execute(...args, client));
                } else {
                    client.on(event.name, (...args) => event.execute(...args, client));
                };

            };

        };
    };

    // root folder to load events
    const eventsPath = join(__dirname, "../events");
    loadEvents(eventsPath);
};