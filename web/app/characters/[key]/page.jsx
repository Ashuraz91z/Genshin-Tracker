import Tracker from '../../../components/Tracker';
export default async function Page({params}){return <Tracker view="characters" characterKey={(await params).key}/>;}
