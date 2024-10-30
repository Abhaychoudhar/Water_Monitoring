const exp=require("express")
const routes=exp.Router();
routes.get("/",(req,res)=>{
    res.json({
        name:"abhay",
    })
})
module.exports=routes