import {NeutronServer} from "../NeutronServer";
import {renderTemplate} from "../Renderer";
import { v4 as uuidv4 } from "uuid";
const server:NeutronServer = NeutronServer.getInstance();

server.app.get('/',async (req,res) => {
    res.send(await renderTemplate("index.html"))
});