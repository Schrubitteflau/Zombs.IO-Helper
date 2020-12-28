// Game.currentGame.network.sendRpc = function (data) { Game.currentGame.network.sendPacket(9, data); console.log(data) };
// Game.currentGame.world.localPlayer.entity.fromTick : données joueur

/*
grid = Game.currentGame.world.entityGrid.cellEntities;

for (let i = 0; i < grid.length; i++)
{
  	const g = grid[i];

    if (Object.keys(g).length > 0)
    {
        console.log(i, g);
    }
}

for (const id in Game.currentGame.world.entities)
{
    const e = Game.currentGame.world.entities[id];
    console.log(e.fromTick.model, e.fromTick.position);
}

clé : position, propriété unique qui vaut true : id de l'entité car une entité est sur plusieurs cases
corrspond à Game.currentGame.world.entities
mais on peut accéder à la position direct depuis les entités
*/

window.addEventListener("load", () =>
{
    main();
});

/* Chaque fois que le popup est cliqué (le mieux serait de conserver l'état de la page) */
async function main()
{
    const tab = await CurrentTab.getInstance();
    const page = new PageController();
    const zombs = new ZombsController();

    if (tab.isZombsUrl())
    {
        if (await zombs.isInGame())
        {
            page.setGlobalMessage("Là on peut s'amuser :)");
            page.setServerName(await zombs.getServerName());

            setTimeout(async function()
            {
                const playerData = await zombs.getPlayerData();
                //const worldEntities = await zombs.getWorldEntities();

                page.setPlayerName(playerData.name);
                page.setPlayerPosition(playerData.position);
                page.setEntities(worldEntities);
            }, 5 * 1000);
        }
        else
        {
            page.setGlobalMessage(`Vous n'êtes actuellement pas dans une partie`);
        }
    }
    else
    {
        page.setGlobalMessage(`Vous n'êtes actuellement pas sur le site <a id="zombs-link">Zombs.IO</a>`);

        document.getElementById("zombs-link").addEventListener("click", () =>
        {
            chrome.tabs.create({ url: "http://zombs.io/" });
        });
    }
}

class ZombsController
{
    async sendTabMessage(message)
    {
        const tab = await CurrentTab.getInstance();

        return tab.sendMessage(message);
    }

    async isInGame()
    {
        return await this.sendTabMessage({ action: "get", element: "isInGame" });
    }

    async getServerName()
    {
        return await this.sendTabMessage({ action: "get", element: "serverName" });
    }

    async getPlayerData()
    {
        return await this.sendTabMessage({ action: "get", element: "playerData" });
    }

    async getWorldEntities()
    {
        return await this.sendTabMessage({ action: "get", element: "worldEntities" });
    }
}

class PageController
{
    constructor()
    {
        this.$globalMessage = document.getElementById("globalMessage");
        this.$serverName = document.getElementById("serverName");
        this.$playerName = document.getElementById("playerName");
        this.$playerPosition = document.getElementById("playerPosition");
        this.$worldEntities = document.getElementById("worldEntities");
    }

    setGlobalMessage(HTML)
    {
        this.$globalMessage.innerHTML = HTML;
    }

    setServerName(name)
    {
        this.$serverName.textContent = name;
    }

    setPlayerName(name)
    {
        this.$playerName.textContent = name;
    }

    setPlayerPosition(position)
    {
        this.$playerPosition.textContent = `[ x: ${position.x}, y : ${position.y} ]`;
    }

    setEntities(entities)
    {
        // Déjà, on vide la liste
        while (this.$worldEntities.firstElementChild)
        {
            this.$worldEntities.removeChild(this.$worldEntities.firstElementChild);
        }

        for (const entityId in entities)
        {
            const entity = entities[entityId];
            const entityData = entity.fromTick;
            const $li = document.createElement("li");

            if (entityData)
            {
                $li.textContent = `${entityData.model} at [ x: ${entityData.position.x}, y: ${entityData.position.y} ]`;
            }

            this.$worldEntities.appendChild($li);
        }
    }
}

class CurrentTab
{
    static instance = null;

    static async getInstance()
    {
        return (CurrentTab.instance ?? new Promise((resolve, reject) =>
        {
            chrome.tabs.query
            (
                {
                    active: true,
                    windowId: chrome.windows.WINDOW_ID_CURRENT
                },
                tabs =>
                {
                    CurrentTab.instance = new CurrentTab(tabs[0]);
                    resolve(CurrentTab.instance);
                }
            );
        }));
    }

    constructor(tab)
    {
        this.tab = tab;
    }

    isZombsUrl()
    {
        const urlRegex = /^https?:\/\/zombs\.io/;

        return (urlRegex.test(this.tab.url));
    }

    // Message can be of any JSON serializable type
    sendMessage(message)
    {
        return new Promise((resolve, reject) =>
        {
            chrome.tabs.sendMessage(this.tab.id, message, function(response)
            {
                resolve(response);
            });
        });
    }
}