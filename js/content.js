/* Ce script s'exécute dans le contexte de la page, mais ne partage que le DOM et non pas
la console. */

// Message is the entire object. Ex : { action: "get", element: "isInGame" }
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse)
{
    const getFunctions =
    {
        "isInGame": isInGame,
        "serverName": getServerName,
        "playerData": getPlayerData,
        "worldEntities": getWorldEntities
    };

    if (message.action === "get" && typeof getFunctions[message.element] === "function")
    {
        getFunctions[message.element]().then((response) =>
        {
            sendResponse(response);
        });
    }

    // Indicate we will return an asynchronous response
    return true;
});

function isInGame()
{
    const extract = new MyExtractor([ "Game.currentGame.options.serverId" ]);

    return new Promise((resolve, reject) =>
    {
        extract.then((values) =>
        {
            const serverId = values.get("Game.currentGame.options.serverId");

            resolve(!!serverId);
        });
    });
}

function getServerName()
{
    const extract = new MyExtractor([ "Game.currentGame.options.serverId", "Game.currentGame.options.servers" ]);

    return new Promise((resolve, reject) =>
    {
        extract.then((values) =>
        {
            try
            {
                const serverId = values.get("Game.currentGame.options.serverId");
                const servers = values.get("Game.currentGame.options.servers");
                const serverName = servers[serverId].name;

                resolve(serverName);
            }
            catch (error)
            {
                reject(error);
            }
        });
    });
}

function getPlayerData()
{
    const extract = new MyExtractor([ "Game.currentGame.world.localPlayer.entity.fromTick" ]);

    return new Promise((resolve, reject) =>
    {
        extract.then((values) =>
        {
            try
            {
                const playerData = values.get("Game.currentGame.world.localPlayer.entity.fromTick");

                resolve(playerData);
            }
            catch (error)
            {
                reject(error);
            }
        });
    });
}

function getWorldEntities()
{
    const extract = new MyExtractor([ "Game.currentGame.world.entities" ]);

    return new Promise((resolve, reject) =>
    {
        extract.then((values) =>
        {
            try
            {
                const entities = values.get("Game.currentGame.world.entities");

                resolve(entities);
            }
            catch (error)
            {
                reject(error);
            }
        });
    });
}

// I wrote this class in order to make easy the extracting of global variables from the page context
class MyExtractor
{
    // Array of variables names, "." is supported to find deep properties
    constructor(variables)
    {
        MyExtractor.listen();

        // Index unique
        this.uniqueID = this.getUniqueID();
        // Variables to extract
        this.variables = variables;
        // Array of functions to call when the values will be resolved
        this.callbacks = [];

        this.registerInstance();
        this.injectScript();
    }

    static index = 0;
    static isListening = false;
    static instances = new Map();

    static listen()
    {
        if (!MyExtractor.isListening)
        {
            MyExtractor.isListening = true;
    
            // Just take the data object from the event object
            window.addEventListener("message", ({ data }) =>
            {
                // Find the instance of MyExtractor corresponding to the uniqueID
                const uniqueID = data.uniqueID;
                const instance = MyExtractor.instances.get(uniqueID);

                if (instance)
                {
                    // Send the values
                    instance.triggerCallbacks(data.values);

                    // Then delete the script tag
                    const $script = document.getElementById(instance.getScriptID());
                    document.body.removeChild($script);
                }
            }, false);
        }
    }

    then(callback)
    {
        this.callbacks.push(callback);

        return this;
    }

    triggerCallbacks(values)
    {
        for (const cb of this.callbacks)
        {
            cb(values);
        }
    }

    registerInstance()
    {
        MyExtractor.instances.set(this.uniqueID, this);
    }

    getUniqueID()
    {
        return MyExtractor.index++;
    }

    getResolveVariableValueFunction()
    {
        // globalPath refers to the path to access the value from the window object. Ex : Game.currentGame.servers
        return function resolveVariableValue(valuePath = "")
        {
            // Separate each parts of the value path. Ex : [ "Game", "currentGame", "servers" ]
            const parts = valuePath.split(".");
            // Start from the first element of the path. Ex : window["Game"] -> window.Game
            let currentValue = window[parts[0]];
            
            // We aren't interested by the first element anymore
            parts.shift();

            // Then, we go through the rest of the parts. Ex : [ "currentGame", "servers" ]
            for (const part of parts)
            {
                if (!currentValue)
                {
                    return null;
                }
                else
                {
                    // window["Game"] -> window["Game"]["currentGame"] -> window["Game"]["currentGame"]["servers"]
                    currentValue = currentValue[part];
                }
            }

            return currentValue;
        }
    }

    getRetrieveValuesAsMapFunction()
    {
        // A simple function which calls resolveVariableValue() one time per value wanted, and gather them into a Map object
        return function retrieveValuesAsMap(valuesPaths = [ ])
        {
            const values = new Map();
            
            for (const path of valuesPaths)
            {
                const value = resolveVariableValue(path);
                values.set(path, value);
            }

            return values;
        }
    }

    getScriptBody()
    {
        const RVV_Def = this.getResolveVariableValueFunction().toString();
        const RVAM_Def = this.getRetrieveValuesAsMapFunction().toString();

        // We put this in an IIFE : definitions of the functions, and call
        const IIFE = `
        (
            function()
            {
                ${RVV_Def};
                ${RVAM_Def};

                const values = retrieveValuesAsMap(${JSON.stringify(this.variables)});

                console.log("SEND VALUES", values);
                window.postMessage({ uniqueID: ${this.uniqueID}, values: values }, "*");
            }
        )();
        `;

        return IIFE;
    }

    injectScript()
    {
        const $script = document.createElement("script");
        const scriptBody = this.getScriptBody();
        const scriptTextNode = document.createTextNode(scriptBody);

        $script.id = this.getScriptID();
        $script.appendChild(scriptTextNode);

        document.body.appendChild($script);
    }

    getScriptID()
    {
        return `ZombsHelper_${this.uniqueID}`;
    }
}