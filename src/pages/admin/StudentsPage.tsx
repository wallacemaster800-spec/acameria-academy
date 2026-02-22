import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function StudentsPage(){

const nav=useNavigate();

const {data:courses,isLoading}=useQuery({

queryKey:["admin-courses"],

queryFn:async()=>{

const {data,error}=await supabase
.from("courses")
.select("id,title,thumbnail_url");

if(error) throw error;
return data;

}

});

if(isLoading) return <div>Cargando...</div>;

return(

<div>

<h1 className="text-xl font-bold mb-6">Cursos</h1>

<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">

{courses?.map(c=>(

<div
key={c.id}
onClick={()=>nav(`/admin/course/${c.id}`)}
className="border rounded-lg p-4 cursor-pointer hover:bg-muted"
>

{c.thumbnail_url && (
<img src={c.thumbnail_url} className="mb-2 rounded"/>
)}

<div className="font-semibold">{c.title}</div>

</div>

))}

</div>

</div>

);
}