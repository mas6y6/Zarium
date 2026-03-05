import {NeutronServer} from "../NeutronServer";
import {renderTemplate} from "../Renderer";
import { v4 as uuidv4 } from "uuid";
const server:NeutronServer = NeutronServer.getInstance();

server.app.get('/',async (req,res) => {
    res.send(await renderTemplate("index.html"))
});

server.app.get('/api/status',async (req,res) => {
    res.send({
        version: server.version,
        motd: server.motd,
        serverTitle: server.serverTitle,
        firstStart: server.firstStart
    })
});