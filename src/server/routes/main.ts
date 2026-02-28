import {NeutronServer} from "../NeutronServer";
import {Database} from "../database/Database";
const server:NeutronServer = NeutronServer.getInstance();

server.app.get('/',(req,res) => {
    if (server.firstStart) {
        res.redirect("/setup");
    } else {

    }
});

server.app.get('/setup',(req,res) => {
   res.send()
});