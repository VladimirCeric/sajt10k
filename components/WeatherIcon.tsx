import {WEATHER_ICONS} from '@/lib/weather-icons';
export default function WeatherIcon({name}:{name:string}){
 return <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#c3c8de" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{__html:WEATHER_ICONS[name]??WEATHER_ICONS.oblak}}/>;
}
