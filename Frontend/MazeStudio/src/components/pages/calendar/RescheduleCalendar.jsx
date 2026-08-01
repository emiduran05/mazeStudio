import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../../api/api";
import "./RescheduleCalendar.css";

const pad=(value)=>String(value).padStart(2,"0");
const key=(date)=>`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;

export default function RescheduleCalendar({eventId,value,onChange}){
 const [month,setMonth]=useState(()=>new Date(new Date().getFullYear(),new Date().getMonth(),1));
 const [slots,setSlots]=useState([]),[timezone,setTimezone]=useState(""),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const [day,setDay]=useState(()=>value?key(new Date(value)):"");
 const range=useMemo(()=>({from:new Date(month.getFullYear(),month.getMonth(),1),to:new Date(month.getFullYear(),month.getMonth()+1,1)}),[month]);
 useEffect(()=>{setLoading(true);setError("");apiRequest(`/calendar/events/${eventId}/reschedule-slots?from=${encodeURIComponent(range.from.toISOString())}&to=${encodeURIComponent(range.to.toISOString())}`).then(data=>{setSlots(data.slots||[]);setTimezone(data.educatorTimezone||"")}).catch(requestError=>setError(requestError.message)).finally(()=>setLoading(false))},[eventId,range.from.getTime(),range.to.getTime()]);
 const grouped=useMemo(()=>slots.reduce((map,slot)=>{const slotKey=key(new Date(slot));(map[slotKey]??=[]).push(slot);return map},{}),[slots]);
 const start=new Date(month.getFullYear(),month.getMonth(),1-month.getDay());
 const days=Array.from({length:42},(_,index)=>new Date(start.getFullYear(),start.getMonth(),start.getDate()+index));
 const selectedSlots=grouped[day]||[];
 return <div className="reschedule_calendar">
  <header><button type="button" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}><i className="fa-solid fa-chevron-left"/></button><div><strong>{month.toLocaleDateString(undefined,{month:"long",year:"numeric"})}</strong><small>Times shown in {Intl.DateTimeFormat().resolvedOptions().timeZone}{timezone&&timezone!==Intl.DateTimeFormat().resolvedOptions().timeZone?` · educator: ${timezone}`:""}</small></div><button type="button" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}><i className="fa-solid fa-chevron-right"/></button></header>
  <div className="reschedule_weekdays">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(label=><span key={label}>{label}</span>)}</div>
  <div className="reschedule_days">{days.map(date=>{const dateKey=key(date),available=Boolean(grouped[dateKey]?.length),outside=date.getMonth()!==month.getMonth();return <button type="button" key={dateKey} className={`${outside?"outside":""} ${available?"available":""} ${day===dateKey?"selected":""}`} disabled={!available} onClick={()=>{setDay(dateKey);onChange("")}}><span>{date.getDate()}</span>{available&&<i/>}</button>})}</div>
  {loading?<div className="reschedule_calendar_status"><i className="fa-solid fa-spinner fa-spin"/> Finding available hours…</div>:error?<div className="reschedule_calendar_status error">{error}</div>:day&&selectedSlots.length?<div className="reschedule_times"><span>Choose a time</span><div>{selectedSlots.map(slot=><button type="button" className={value===slot?"selected":""} key={slot} onClick={()=>onChange(slot)}>{new Date(slot).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</button>)}</div></div>:<div className="reschedule_calendar_status">Choose a highlighted day to see available hours.</div>}
 </div>;
}
