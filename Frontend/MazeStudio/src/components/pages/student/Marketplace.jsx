import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../../api/api";
import "./Marketplace.css";
import "./EducatorProfileLink.css";

const types = [
    ["", "All formats"], ["SELF_PACED", "Self-paced"], ["COHORT", "Group courses"],
    ["WEBINAR", "Webinars"], ["HYBRID", "Hybrid"], ["ONE_TO_ONE", "1:1"],
];

const money = (amount, currency) => amount === 0 ? "Free" : new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount / 100);

export default function Marketplace() {
    const [items, setItems] = useState([]);
    const [search, setSearch] = useState("");
    const [type, setType] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(true); setError("");
            apiRequest(`/marketplace/offerings?search=${encodeURIComponent(search)}&type=${encodeURIComponent(type)}`)
                .then(data => setItems(data.offerings || []))
                .catch(err => setError(err.message))
                .finally(() => setLoading(false));
        }, 250);
        return () => clearTimeout(timer);
    }, [search, type]);
    const countLabel = useMemo(() => `${items.length} ${items.length === 1 ? "experience" : "experiences"}`, [items.length]);
    return <div className="student_page_stack marketplace_page">
        <section className="marketplace_hero"><div><span className="student_section_kicker">Learn your way</span><h2>Find an experience built for your goals.</h2><p>Learn independently, join a live group, attend a focused webinar or work directly with an educator.</p></div><div className="marketplace_hero_icon"><i className="fa-solid fa-compass" /></div></section>
        <section className="marketplace_toolbar"><div className="marketplace_search"><i className="fa-solid fa-magnifying-glass"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search courses or educators"/></div><label className="marketplace_filter"><span>Format</span><select value={type} onChange={e=>setType(e.target.value)}>{types.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label></section>
        <div className="marketplace_results_header"><div><span className="student_section_kicker">Explore</span><h3>Available Learning Journeys</h3></div><span>{countLabel}</span></div>
        {loading ? <div className="marketplace_status"><i className="fa-solid fa-spinner fa-spin"/> Finding experiences…</div> : error ? <div className="marketplace_status error">{error}</div> : items.length ? <section className="marketplace_grid">{items.map(item=><article className="marketplace_card" key={item.id}>
            <div className="marketplace_cover">{item.cover_url?<img src={item.cover_url} alt=""/>:<i className="fa-solid fa-route"/>}<span>{item.experiences.length} {item.experiences.length===1?"experience":"experiences"}</span></div>
            <div className="marketplace_card_body"><Link className="marketplace_educator_link" to={`/educators/${item.educator_slug||item.educator_id}`}>{item.educator_avatar_url?<img src={item.educator_avatar_url} alt=""/>:<i className="fa-solid fa-user-graduate"/>}<span>By <strong>{item.educator_name}</strong></span></Link><h3>{item.title}</h3><p>{item.description||"A guided learning experience designed by your educator."}</p><div className="marketplace_meta"><span><i className="fa-solid fa-signal"/> {item.difficulty||"All levels"}</span><span><i className="fa-solid fa-layer-group"/> {item.experiences.map(x=>x.offering_type.replaceAll("_"," ")).join(" · ")}</span></div><footer><strong>From {money(item.minimum_price,item.currency)}</strong><Link to={`/marketplace/journeys/${item.id}`}>Preview course <i className="fa-solid fa-arrow-right"/></Link></footer></div>
        </article>)}</section> : <section className="student_empty_state"><div className="student_empty_icon"><i className="fa-solid fa-store"/></div><h3>No experiences found</h3><p>Try another search or format. Only currently published offers appear here.</p></section>}
    </div>;
}
