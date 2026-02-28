import {renderTemplate} from "./Renderer";
import {NeutronServer} from "./NeutronServer";

NeutronServer.getInstance().app.use(async (req, res, next) => {
    res.status(404).send(await renderTemplate("error.html"));
});