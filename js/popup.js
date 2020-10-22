// Game.currentGame.network.sendRpc = function (data) { Game.currentGame.network.sendPacket(9, data); console.log(data) };
// Game.currentGame.world.localPlayer.entity.fromTick : données joueur

/*
grid = Game.currentGame.world.entityGrid.cellEntities;

function numKeys(obj)
{
  	return Object.keys(obj).length;
}

for (let i = 0; i < grid.length; i++)
{
  	const g = grid[i];

    if (numKeys(g) > 0)
    {
        console.log(i, g);
    }
}

clé : position, propriété unique qui vaut true : id de l'entité car une entité est sur plusieurs cases
corrspond à Game.currentGame.world.entities
mais on peut accéder à la position direct depuis les entités
*/

window.addEventListener("load", () =>
{
    main();
});

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
}

class PageController
{
    constructor()
    {
        this.$globalMessage = document.getElementById("globalMessage");
        this.$serverName = document.getElementById("serverName");
    }

    setGlobalMessage(HTML)
    {
        this.$globalMessage.innerHTML = HTML;
    }

    setServerName(name)
    {
        this.$serverName.textContent = name;
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