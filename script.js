const SCRIPT_URL="https://script.google.com/macros/s/AKfycbxt4U3enDQmX-3sHeaTglbQqrxptghPAkIuLCu2BylOuDA-gbo16z7-IX2qxPr6tgqe/exec";

let priorityChartInstance=null;
let monthlyChartInstance=null;

document.addEventListener("DOMContentLoaded",()=>{

setupNavigation();
setupForm();
setupTrack();
setupAdminLogin();
setupAdminFilters();
setupFilePreview();
setupChat();
loadAnalytics();

});

/* =========================
NAVIGATION
========================= */

function setupNavigation(){

const links=document.querySelectorAll("[data-page]");
const sections=document.querySelectorAll(".page-section");

links.forEach(link=>{

link.addEventListener("click",e=>{

e.preventDefault();

const page=link.dataset.page;

sections.forEach(sec=>sec.classList.remove("active"));

const target=document.getElementById(page);
if(target) target.classList.add("active");

window.scrollTo(0,0);

});

});

}

/* =========================
SUBMIT COMPLAINT
========================= */



function setupForm(){

const form=document.getElementById("complaintForm");
if(!form) return;

form.addEventListener("submit", async function(e){

e.preventDefault();

const submitBtn=document.getElementById("submitBtn");
const resultDiv=document.getElementById("submitResult");

submitBtn.disabled=true;
submitBtn.innerHTML="Submitting...";

resultDiv.innerHTML=getLoadingHTML("Processing complaint...");

const file=document.getElementById("fileUpload").files[0];

let fileData="";
let fileName="";
let fileType="";

/* Convert file to Base64 if exists */

if(file){

fileData = await new Promise((resolve,reject)=>{

const reader=new FileReader();

reader.onload=()=>{
resolve(reader.result.split(",")[1]);
};

reader.onerror=reject;

reader.readAsDataURL(file);

});

fileName=file.name;
fileType=file.type;

}

const formData=new URLSearchParams();

formData.append("action","submit");
formData.append("name",document.getElementById("name").value.trim());
formData.append("email",document.getElementById("email").value.trim());
formData.append("subject",document.getElementById("subject").value.trim());
formData.append("description",document.getElementById("description").value.trim());
formData.append("priority",document.getElementById("priority").value);

if(fileData){

formData.append("fileData",fileData);
formData.append("fileName",fileName);
formData.append("fileType",fileType);

}

try{

const response=await fetch(SCRIPT_URL,{
method:"POST",
body:formData
});

const result=await response.json();

if(!result.success) throw new Error("Submission failed");

resultDiv.innerHTML=`
<div class="ticket-card">
<div class="ticket-success">Complaint Submitted Successfully</div>
<div class="ticket-id">Ticket ID: ${result.ticketId}</div>
<p>Use this Ticket ID to track your complaint.</p>
</div>
`;

form.reset();

}catch(err){

resultDiv.innerHTML=`<div class="alert error">${err.message}</div>`;

}

submitBtn.disabled=false;
submitBtn.innerHTML="Submit Complaint";

});

}
/* =========================
TRACK TICKET
========================= */

function setupTrack(){

const btn=document.getElementById("trackBtn");
if(!btn) return;

btn.addEventListener("click",trackTicket);

}

async function trackTicket(){

const ticketId=document.getElementById("trackTicketId").value.trim();
const resultDiv=document.getElementById("trackResult");

if(!ticketId){

resultDiv.innerHTML=`<div class="alert error">Enter Ticket ID</div>`;
return;

}

resultDiv.innerHTML=getLoadingHTML("Searching ticket...");

try{

const params=new URLSearchParams();
params.append("action","track");
params.append("ticketId",ticketId);

const res=await fetch(SCRIPT_URL,{
method:"POST",
body:params
});

const data=await res.json();

if(!data.success) throw new Error("Ticket not found");

const t=data.ticket;

resultDiv.innerHTML=`

<div class="ticket-display">

<h3>${t["Ticket ID"]}</h3>

<p><b>Status:</b> ${t.Status}</p>
<p><b>Name:</b> ${t.Name}</p>
<p><b>Email:</b> ${t.Email}</p>
<p><b>Subject:</b> ${t.Subject}</p>
<p><b>Priority:</b> ${t.Priority}</p>
<p><b>Created:</b> ${new Date(t["Created Date"]).toLocaleString()}</p>

</div>
`;

}catch(err){

resultDiv.innerHTML=`<div class="alert error">${err.message}</div>`;

}

}

/* =========================
ADMIN LOGIN
========================= */

function setupAdminLogin(){

const btn=document.getElementById("adminLoginBtn");
if(!btn) return;

btn.addEventListener("click",async()=>{

btn.disabled=true;
btn.innerHTML="Logging in...";

const username=document.getElementById("adminUsername").value.trim();
const password=document.getElementById("adminPassword").value.trim();

const error=document.getElementById("adminError");

error.textContent="";

try{

const params=new URLSearchParams();
params.append("action","adminLogin");
params.append("username",username);
params.append("password",password);

const res=await fetch(SCRIPT_URL,{
method:"POST",
body:params
});

const data=await res.json();

if(data.success){

document.getElementById("adminLoginSection").style.display="none";
document.getElementById("adminDashboardSection").style.display="block";

loadTickets();

}else{

error.textContent="Invalid Admin Login";

}

}catch{

error.textContent="Login Failed";

}

btn.disabled=false;
btn.innerHTML="Login";

});

}

/* =========================
ADMIN FILTERS
========================= */

function setupAdminFilters(){

const refreshBtn=document.getElementById("refreshBtn");
const statusFilter=document.getElementById("filterStatus");
const priorityFilter=document.getElementById("filterPriority");
const searchTicket=document.getElementById("searchTicket");

if(refreshBtn) refreshBtn.onclick=loadTickets;
if(statusFilter) statusFilter.onchange=loadTickets;
if(priorityFilter) priorityFilter.onchange=loadTickets;
if(searchTicket) searchTicket.oninput=loadTickets;

}

/* =========================
LOAD TICKETS
========================= */

async function loadTickets(){

const resultDiv=document.getElementById("adminResult");

resultDiv.innerHTML=getLoadingHTML("Loading tickets...");

try{

const res=await fetch(SCRIPT_URL+"?action=getTickets");
const data=await res.json();

if(!data.success) throw new Error();

const tickets=data.tickets||[];
const statusFilter=document.getElementById("filterStatus")?.value || "";
const priorityFilter=document.getElementById("filterPriority")?.value || "";
const searchTicket=document.getElementById("searchTicket")?.value.toLowerCase() || "";

let filteredTickets=tickets.filter(t=>{

let matchStatus=!statusFilter || t.Status===statusFilter;
let matchPriority=!priorityFilter || t.Priority===priorityFilter;

let matchSearch=
!searchTicket ||
t["Ticket ID"].toLowerCase().includes(searchTicket) ||
t.Name.toLowerCase().includes(searchTicket) ||
t.Email.toLowerCase().includes(searchTicket) ||
t.Subject.toLowerCase().includes(searchTicket);

return matchStatus && matchPriority && matchSearch;

});

if(filteredTickets.length===0){

resultDiv.innerHTML="No tickets found";
return;

}

resultDiv.innerHTML=filteredTickets.map(t=>`

<div class="ticket-item">

<strong>${t.Subject}</strong>

<p>${t.Name} • ${t.Email}</p>

<select onchange="updateStatus('${t["Ticket ID"]}',this.value)">

<option ${t.Status==="Pending"?"selected":""}>Pending</option>
<option ${t.Status==="In Progress"?"selected":""}>In Progress</option>
<option ${t.Status==="Resolved"?"selected":""}>Resolved</option>

</select>

<p>Priority: ${t.Priority}</p>

</div>

`).join("");

}catch{

resultDiv.innerHTML="Error loading tickets";

}

}

/* =========================
UPDATE STATUS
========================= */

async function updateStatus(ticketId,status){

const params=new URLSearchParams();

params.append("action","updateStatus");
params.append("ticketId",ticketId);
params.append("status",status);

await fetch(SCRIPT_URL,{
method:"POST",
body:params
});

showMessage("Status Updated Successfully");

loadTickets();

}

/* =========================
CHAT
========================= */

function setupChat(){

const buttons=document.querySelectorAll(".chat-options button");

buttons.forEach(btn=>{

btn.onclick=()=>{

const chat=document.getElementById("chatMessages");

chat.innerHTML+=`<div class="message user">${btn.textContent}</div>`;

let reply="";

if(btn.dataset.option==="submit")
reply="You can submit a complaint in the Submit Complaint section.";

if(btn.dataset.option==="track")
reply="Go to Track Ticket section and enter your ticket ID.";

if(btn.dataset.option==="agent")
reply="Our support team will contact you soon.";

if(btn.dataset.option==="priority")
reply="Priority determines how urgent your complaint is.";

if(btn.dataset.option==="time")
reply="Resolution usually takes 24-48 hours.";

chat.innerHTML+=`<div class="message admin">${reply}</div>`;

};

});

}

/* =========================
ANALYTICS
========================= */

function loadAnalytics(){

const priorityCanvas=document.getElementById("priorityChart");
const monthlyCanvas=document.getElementById("monthlyChart");

if(priorityCanvas){

if(priorityChartInstance) priorityChartInstance.destroy();

priorityChartInstance=new Chart(priorityCanvas,{

type:"doughnut",

data:{
labels:["Low","Medium","High"],
datasets:[{
data:[20,45,55],
backgroundColor:["#10B981","#F59E0B","#EF4444"]
}]
},

options:{
responsive:true,
maintainAspectRatio:false,
plugins:{legend:{position:"bottom"}}
}

});

}

if(monthlyCanvas){

if(monthlyChartInstance) monthlyChartInstance.destroy();

monthlyChartInstance=new Chart(monthlyCanvas,{

type:"line",

data:{
labels:["Jan","Feb","Mar","Apr","May","Jun"],
datasets:[{
label:"Complaints",
data:[12,19,15,25,22,30],
borderColor:"#2563EB",
backgroundColor:"rgba(37,99,235,0.2)",
fill:true,
tension:0.4
}]
},

options:{
responsive:true,
maintainAspectRatio:false
}

});

}

}

/* =========================
FILE PREVIEW
========================= */

function setupFilePreview(){

const fileInput=document.getElementById("fileUpload");
if(!fileInput) return;

fileInput.onchange=function(){

const file=this.files[0];

if(!file) return;

if(file.size/1024>500){

alert("File must be under 500KB");
this.value="";

}

};

}

/* =========================
HELPERS
========================= */

function getLoadingHTML(text){
return `<div class="loading">${text}</div>`;
}

function showMessage(msg){

const div=document.createElement("div");

div.className="alert success popup-message";
div.textContent=msg;

document.body.appendChild(div);

setTimeout(()=>{
div.remove();
},3000);

}
