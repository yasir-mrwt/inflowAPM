import app from "./app.js";
import { config } from "./configs/env.js";

const port = config.port;

app.listen(port, () => {
  console.log(`server is listening at port:${port}`);
});
