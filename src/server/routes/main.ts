import {NeutronServer} from "../NeutronServer";
import {Database} from "../database/Database";
import {renderTemplate} from "../Renderer";
const server:NeutronServer = NeutronServer.getInstance();

server.app.get('/',(req,res) => {
    if (server.firstStart) {
        res.redirect("/setup");
    } else {

    }
});

server.app.get('/setup',async (req,res) => {
   res.send(await renderTemplate("setup/setup.html"))
});