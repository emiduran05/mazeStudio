import { useEffect, useRef, useState } from "react";

const format=(seconds)=>{const value=Math.max(0,Math.round(Number(seconds)||0));return `${Math.floor(value/60)}:${String(value%60).padStart(2,"0")}`};

export default function ReliableAudio({src,durationSeconds,className=""}){
 const ref=useRef(null),repairing=useRef(false);const[duration,setDuration]=useState(Number(durationSeconds)||0);
 useEffect(()=>{setDuration(Number(durationSeconds)||0);repairing.current=false},[src,durationSeconds]);
 function metadata(){const audio=ref.current;if(!audio)return;if(Number.isFinite(audio.duration)&&audio.duration>0){setDuration(audio.duration);return}repairing.current=true;try{audio.currentTime=Number.MAX_SAFE_INTEGER}catch{}}
 function durationChanged(){const audio=ref.current;if(!audio)return;if(Number.isFinite(audio.duration)&&audio.duration>0){setDuration(audio.duration);if(repairing.current){repairing.current=false;audio.currentTime=0;audio.pause()}}}
 return <div className={`reliable_audio ${className}`}><audio ref={ref} controls preload="metadata" src={src} onLoadedMetadata={metadata} onDurationChange={durationChanged} onTimeUpdate={durationChanged}/>{duration>0&&<small>Duration {format(duration)}</small>}</div>;
}
