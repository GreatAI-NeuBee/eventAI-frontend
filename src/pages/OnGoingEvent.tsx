import React, { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Activity, AlertTriangle, CheckCircle2, Map, DoorOpen, RefreshCw } from "lucide-react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Spinner from "../components/common/Spinner";
import { useEventStore } from "../store/eventStore";

/* ========= Types from the map editor ========= */
type PctPoint = [number, number];

type StadiumMapJSON = {
  sections: number;
  layers: number;
  exits: number;
  zones: { id: string; name: string; layer: number; points: PctPoint[] }[];
  exitsList?: { id: string; name: string; position: PctPoint; capacity?: number }[];
  toiletsList?: { id: string; position: PctPoint; label?: string; fixtures?: number }[];
};

// ==== Page types ====
export type FloorZonePolygon = {
  id: string;
  name: string;
  layer: number;
  section: number; // synthesized if not present
  points: Array<[number, number]>;
  congestion: number; // 0..100
};

// ==== Colors ====
const COLORS = { red: "#DA5C53", blue: "#4AA3BA", green: "#A8E4B1" };
const bandedColor = (p: number) => (p >= 67 ? COLORS.red : p >= 34 ? COLORS.blue : COLORS.green);


// ---- Demo fallback (your provided JSON) ----
const FALLBACK_PLAN: StadiumMapJSON = /* paste of your JSON */ {
  "sections": 7,
  "layers": 2,
  "exits": 4,
  "zones": [
    { "id": "L1-S1", "name": "Layer 1 · Section 1", "layer": 1, "points": [[50.63757018038382,12.992378828894896],[52.68277260474569,13.179306662063961],[54.694070972680414,13.594606368989133],[56.64604711298789,14.23302951949304],[58.51403255056576,15.086507917828936],[60.274420259023216,16.144255566061194],[61.90496299903196,17.392904974195353],[63.385054472105715,18.816676094412138],[64.69598973667334,20.3975757444665],[65.82120159538697,22.115625],[66.7464699662751,23.94911168205226],[67.4601015917723,25.874864748911875],[67.95307781451778,27.868547124626872],[68.219168552378,29.904963263497805],[68.25501103231164,31.95837756364797],[68.06015228806285,34.00283960565775],[67.6370548846096,36.01251210599707],[66.99106579702367,37.9619974406813],[66.13034883704152,39.82665861264474],[58.73014432439264,35.89190007704549],[59.19598566229608,34.88269926485043],[59.54561095704837,33.82758951477501],[59.77460175152769,32.739904979866765],[59.88006413038558,31.633391483301775],[59.86066529246048,30.522032802892074],[59.71665039430966,29.419873948395384],[59.44983945199582,28.340843664994384],[59.06360434028301,27.298578406091917],[58.56282617991864,26.306250000000002],[57.9538336515283,25.376399188418063],[57.244323015693205,24.52077714039001],[56.44326084997214,23.75019694463806],[55.56077073204746,23.074396957067673],[54.60800530105885,22.501917730415798],[53.597005313974286,22.03999408136777],[52.54054747820062,21.694463659165518],[51.45198298347851,21.469693171188908],[50.34506877364598,21.368523197848692]] },
    { "id": "L1-S2", "name": "Layer 1 · Section 2", "layer": 1, "points": [[65.4927786566577,40.93096255846036],[64.30829319227797,42.608695897254734],[62.94298391192919,44.1428815250138],[61.41410517507497,45.514130874849215],[59.7409784817459,46.70511451852309],[57.944748293354785,47.700781170441005],[56.048114815485825,48.488547901177775],[54.07504711966659,49.058459156675994],[52.05048022960177,49.403312573481244],[50,49.51875],[47.94951977039823,49.403312573481244],[45.924952880333414,49.058459156675994],[43.951885184514175,48.48854790117778],[42.055251706645215,47.700781170441005],[40.25902151825411,46.7051145185231],[38.58589482492502,45.514130874849215],[37.05701608807082,44.142881525013806],[35.69170680772203,42.60869589725475],[34.507221343342295,40.93096255846036],[41.61492444925334,36.48957672510581],[42.255997321182434,37.39760756396066],[42.99493652115225,38.22794682605947],[43.82240356244659,38.97010093876547],[44.72794117067328,39.61469078628243],[45.70010543958698,40.15357024004025],[46.72661045566248,40.57992910696656],[47.79448356369738,40.88837919461561],[48.8902293112453,41.07502240549002],[50,41.1375],[51.10977068875471,41.07502240549002],[52.20551643630262,40.88837919461561],[53.273389544337526,40.57992910696656],[54.29989456041302,40.15357024004025],[55.272058829326724,39.614690786282424],[56.177596437553404,38.97010093876547],[57.00506347884775,38.227946826059465],[57.74400267881757,37.397607563960655],[58.38507555074666,36.48957672510581]] },
    { "id": "L1-S3", "name": "Layer 1 · Section 3", "layer": 1, "points": [[33.86965116295848,39.82665861264475],[33.008934202976334,37.961997440681294],[32.3629451153904,36.012512105997075],[31.939847711937144,34.00283960565774],[31.74498896768835,31.958377563647982],[31.780831447622003,29.904963263497798],[32.04692218548222,27.868547124626865],[32.5398984082277,25.874864748911875],[33.2535300337249,23.949111682052255],[34.17879840461304,22.115625],[35.30401026332667,20.397575744466494],[36.614945527894285,18.816676094412138],[38.09503700096804,17.392904974195353],[39.72557974097677,16.1442555660612],[41.48596744943424,15.086507917828936],[43.35395288701212,14.233029519493037],[45.30592902731959,13.594606368989133],[47.3172273952543,13.179306662063965],[49.362429819616175,12.9923788288949],[49.654931226354016,21.368523197848692],[48.548017016521484,21.46969317118891],[47.45945252179938,21.694463659165514],[46.40299468602572,22.039994081367766],[45.39199469894115,22.501917730415798],[44.439229267952534,23.074396957067677],[43.55673915002786,23.75019694463806],[42.75567698430679,24.52077714039001],[42.0461663484717,25.376399188418063],[41.43717382008136,26.30625],[40.93639565971699,27.298578406091917],[40.55016054800418,28.340843664994384],[40.28334960569034,29.41987394839538],[40.13933470753952,30.522032802892067],[40.11993586961442,31.633391483301782],[40.22539824847231,32.739904979866765],[40.45438904295163,33.82758951477501],[40.80401433770392,34.88269926485043],[41.26985567560736,35.8919000770455]] },
    { "id": "L2-S1", "name": "Layer 2 · Section 1", "layer": 2, "points": [[50.985910781845654,3.0172091367105445],[53.33403213959829,3.1974291785560993],[55.6589835665072,3.5726011880812507],[57.944607760686566,4.1401178990236325],[60.17502072573307,4.896035341320989],[62.334722156913806,5.835100249819206],[64.40870316088032,6.9507865719559305],[66.38255056030826,8.235340820708569],[68.24254705859524,9.67983595762567],[69.97576656851997,11.274233431480035],[71.57016404237433,13.007452941404772],[73.01465917929143,14.867449439691732],[74.29921342804407,16.84129683911967],[75.41489975018078,18.915277843086187],[76.35396465867902,21.07497927426693],[77.10988210097636,23.305392239313438],[77.67739881191875,25.591016433492797],[78.05257082144391,27.915967860401704],[78.23279086328945,30.264089218154346],[69.85664649433565,30.556590624892184],[69.72989438968366,28.905113236331196],[69.46602894316143,27.26993169072425],[69.06688389358493,25.662409718756066],[68.53523310839392,24.09371883028641],[67.87477130659839,22.574760677692698],[67.09008838224604,21.11609129459324],[66.18663750685121,19.727847736455757],[65.17069723245753,18.41967763290393],[64.04932785870022,17.200672141299787],[62.83032236709607,16.07930276754248],[61.52215226354424,15.063362493148794],[60.13390870540676,14.159911617753963],[58.6752393223073,13.375228693401606],[57.156281169713594,12.714766891606068],[55.58759028124393,12.183116106415074],[53.98006830927575,11.783971056838563],[52.3448867636688,11.520105610316339],[50.69340937510782,11.393353505664344]] },
    { "id": "L2-S2", "name": "Layer 2 · Section 2", "layer": 2, "points": [[78.23279086328945,32.235910781845654],[78.05257082144391,34.58403213959829],[77.67739881191875,36.9089835665072],[77.10988210097636,39.194607760686566],[76.35396465867902,41.42502072573307],[75.4148997501808,43.58472215691381],[74.29921342804407,45.65870316088032],[73.01465917929143,47.63255056030827],[71.57016404237433,49.49254705859523],[69.97576656851997,51.225766568519965],[68.24254705859524,52.82016404237433],[66.38255056030826,54.26465917929143],[64.40870316088034,55.54921342804407],[62.334722156913806,56.664899750180794],[60.17502072573307,57.60396465867901],[57.944607760686566,58.359882100976364],[55.6589835665072,58.92739881191875],[53.3340321395983,59.3025708214439],[50.985910781845654,59.48279086328945],[50.69340937510782,51.106646494335656],[52.344886763668804,50.979894389683665],[53.98006830927575,50.71602894316143],[55.58759028124393,50.31688389358493],[57.156281169713594,49.78523310839393],[58.6752393223073,49.12477130659839],[60.13390870540676,48.34008838224604],[61.52215226354424,47.436637506851206],[62.83032236709607,46.42069723245752],[64.04932785870022,45.29932785870021],[65.17069723245753,44.08032236709607],[66.18663750685121,42.77215226354424],[67.09008838224604,41.38390870540676],[67.87477130659839,39.9252393223073],[68.53523310839394,38.40628116971359],[69.06688389358493,36.83759028124393],[69.46602894316143,35.23006830927575],[69.72989438968366,33.5948867636688],[69.85664649433565,31.943409375107816]] },
    { "id": "L2-S3", "name": "Layer 2 · Section 3", "layer": 2, "points": [[49.01408921815435,59.48279086328945],[46.66596786040171,59.3025708214439],[44.3410164334928,58.92739881191875],[42.05539223931344,58.359882100976364],[39.82497927426693,57.60396465867902],[37.6652778430862,56.664899750180794],[35.59129683911968,55.54921342804408],[33.61744943969173,54.26465917929143],[31.75745294140477,52.82016404237433],[30.024233431480035,51.22576656851997],[28.429835957625674,49.492547058595235],[26.985340820708576,47.632550560308275],[25.700786571955938,45.65870316088034],[24.585100249819213,43.58472215691382],[23.646035341320985,41.42502072573307],[22.890117899023632,39.194607760686566],[22.32260118808125,36.9089835665072],[21.9474291785561,34.584032139598285],[21.767209136710544,32.23591078184565],[30.143353505664344,31.943409375107812],[30.27010561031634,33.59488676366879],[30.533971056838563,35.23006830927575],[30.933116106415074,36.83759028124393],[31.464766891606065,38.40628116971359],[32.12522869340161,39.925239322307306],[32.90991161775396,41.38390870540677],[33.8133624931488,42.77215226354424],[34.82930276754249,44.08032236709607],[35.95067214129979,45.29932785870022],[37.16967763290393,46.42069723245752],[38.47784773645576,47.436637506851206],[39.86609129459325,48.340088382246044],[41.32476067769271,49.12477130659839],[42.84371883028641,49.78523310839394],[44.41240971875607,50.31688389358493],[46.01993169072425,50.71602894316143],[47.6551132363312,50.979894389683665],[49.30659062489219,51.106646494335656]] },
    { "id": "L2-S4", "name": "Layer 2 · Section 4", "layer": 2, "points": [[21.767209136710544,30.26408921815435],[21.9474291785561,27.915967860401725],[22.322601188081247,25.591016433492815],[22.890117899023632,23.30539223931344],[23.64603534132098,21.074979274266937],[24.58510024981921,18.915277843086187],[25.70078657195593,16.84129683911967],[26.98534082070858,14.867449439691722],[28.429835957625667,13.007452941404772],[30.024233431480027,11.274233431480035],[31.757452941404765,9.679835957625674],[33.617449439691725,8.235340820708576],[35.591296839119664,6.9507865719559305],[37.6652778430862,5.835100249819202],[39.82497927426692,4.896035341320992],[42.05539223931345,4.140117899023629],[44.341016433492804,3.572601188081247],[46.665967860401715,3.1974291785560993],[49.014089218154325,3.017209136710548],[49.30659062489217,11.393353505664344],[47.6551132363312,11.520105610316339],[46.019931690724256,11.78397105683856],[44.412409718756074,12.18311610641507],[42.843718830286406,12.714766891606068],[41.32476067769271,13.375228693401606],[39.86609129459323,14.159911617753963],[38.47784773645575,15.063362493148798],[37.16967763290393,16.079302767542483],[35.95067214129978,17.200672141299787],[34.82930276754248,18.41967763290393],[33.8133624931488,19.72784773645575],[32.90991161775396,21.11609129459324],[32.12522869340161,22.574760677692698],[31.464766891606065,24.093718830286416],[30.933116106415074,25.66240971875607],[30.53397105683856,27.26993169072426],[30.270105610316335,28.90511323633121],[30.143353505664344,30.556590624892184]] }
  ],
  "exitsList": [
    { "id": "exit-1758381478686","name":"Exit 1","position":[20.95,31.250000000000004],"capacity":800 },
    { "id": "exit-1758381479721","name":"Exit 2","position":[49.99999999999999,2.1999999999999993],"capacity":800 },
    { "id": "exit-1758381480612","name":"Exit 3","position":[79.05,31.25],"capacity":800 },
    { "id": "exit-1758381481678","name":"Exit 4","position":[50,60.3],"capacity":800 }
  ],
  "toiletsList": [
    { "id":"wc-1758381491645","position":[54.64659685863874,7.984293193717278],"label":"WC 1","fixtures":0 },
    { "id":"wc-1758381492709","position":[25.981675392670155,22.643979057591626],"label":"WC 2","fixtures":0 },
    { "id":"wc-1758381495102","position":[60.40575916230366,50.261780104712045],"label":"WC 5","fixtures":0 },
    { "id":"wc-1758381496440","position":[43.1282722513089,53.53403141361257],"label":"WC 7","fixtures":0 },
    { "id":"wc-1758381497874","position":[72.57853403141361,25.654450261780102],"label":"WC 8","fixtures":0 },
    { "id":"wc-1758381498576","position":[72.97120418848168,34.16230366492146],"label":"WC 9","fixtures":0 },
    { "id":"wc-1758381502851","position":[50.85078534031413,43.324607329842934],"label":"WC 10","fixtures":0 },
    { "id":"wc-1758381504196","position":[61.976439790575924,24.73821989528796],"label":"WC 10","fixtures":0 },
    { "id":"wc-1758381505565","position":[38.41623036649215,23.298429319371728],"label":"WC 10","fixtures":0 },
    { "id":"wc-1758381507021","position":[33.311518324607334,14.00523560209424],"label":"WC 10","fixtures":0 }
  ]
};

// ====== SVG Stadium that consumes the saved JSON ======
// ====== SVG Stadium (circular frame + clip) ======
// ====== SVG Stadium (circular frame + clip, driven by saved plan JSON) ======
const StadiumPlanSVG: React.FC<{
  plan: StadiumMapJSON;
  zones: FloorZonePolygon[];
}> = ({ plan, zones }) => {
  // ViewBox
  const vbW = 100;
  const vbH = 62.5;

  // Circle geometry
  const cx = 50;
  const cy = 31.25;
  const MARGIN = 3;
  const R = Math.min(vbW / 2 - MARGIN, vbH / 2 - MARGIN); // outer radius

  // Layered ring look (cosmetic)
  const layers = Math.max(1, plan?.layers ?? 1);
  const GAP = 1.6;
  const voidRatio = 0.35;
  const rVoid = Math.max(4, R * voidRatio);
  const usable = R - rVoid - Math.max(0, layers - 1) * GAP;
  const ringThick = Math.max(1, usable / layers);

  // Counts and lists from plan
  const dividerSections = plan?.sections ?? plan?.zones?.length ?? 0;
  const exitsList = plan?.exitsList ?? [];
  const toilets = plan?.toiletsList ?? [];

  // Center readout (current hovered zone)
  const [centerZone, setCenterZone] = useState<FloorZonePolygon | null>(null);
  const clearCenter = () => setCenterZone(null);

  return (
    <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden border border-gray-300 bg-white shadow">
      <svg
        viewBox={`0 0 ${vbW} ${vbH}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        onMouseLeave={clearCenter}
      >
        {/* Clip everything to the stadium circle */}
        <defs>
          <clipPath id="stadiumClip">
            <circle cx={cx} cy={cy} r={R} />
          </clipPath>
        </defs>

        {/* Outer bowl */}
        <circle cx={cx} cy={cy} r={R} fill="#ffffff" stroke="#e5e7eb" strokeWidth={0.8} />

        {/* Inside the bowl */}
        <g clipPath="url(#stadiumClip)">
          {/* inner field/void */}
          <circle cx={cx} cy={cy} r={rVoid - 1} fill="#0f172a" />

          {/* Cosmetic rings */}
          {Array.from({ length: layers }, (_, li) => {
            const rIn = rVoid + li * (ringThick + GAP);
            const rOut = rIn + ringThick;
            return (
              <g key={`ring-${li}`}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={rIn}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeOpacity={0.35}
                  strokeWidth={0.5}
                  strokeDasharray="1,1"
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={rOut}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeOpacity={0.6}
                  strokeWidth={0.5}
                />
              </g>
            );
          })}

          {/* Section dividers */}
          {Array.from({ length: Math.max(0, dividerSections) }, (_, i) => {
            const angle = (i * 360) / Math.max(1, dividerSections);
            const rad = (angle * Math.PI) / 180;
            const x1 = cx + (rVoid - 0.5) * Math.cos(rad);
            const y1 = cy + (rVoid - 0.5) * Math.sin(rad);
            const x2 = cx + (R - 0.5) * Math.cos(rad);
            const y2 = cy + (R - 0.5) * Math.sin(rad);
            return (
              <line
                key={`divider-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#cbd5e1"
                strokeOpacity={0.5}
                strokeWidth={0.4}
                strokeDasharray="2,1"
              />
            );
          })}

          {/* Zones (from plan, tinted by congestion) */}
          {zones.map((z) => {
            const fill =
              z.congestion >= 67 ? "#DA5C53" : z.congestion >= 34 ? "#4AA3BA" : "#A8E4B1";
            const fillOpacity = 0.45 + (z.congestion / 100) * 0.25; // 0.45..0.70
            const pts = z.points.map(([x, y]) => `${x},${y}`).join(" ");
            return (
              <polygon
                key={z.id}
                points={pts}
                fill={fill}
                opacity={fillOpacity}
                stroke="#0b1220"
                strokeOpacity={0.25}
                strokeWidth={0.25}
                onMouseEnter={() => setCenterZone(z)}
                onMouseMove={() => setCenterZone(z)}
                onMouseLeave={clearCenter}
                style={{ cursor: "pointer" }}
              />
            );
          })}

          {/* Toilets (🚻), kept inside clip */}
          {toilets.map((t) => (
            <g key={t.id}>
              <text
                x={t.position[0]}
                y={t.position[1]}
                fontSize={3}
                textAnchor="middle"
                dominantBaseline="central"
                aria-label={t.label ?? "Toilet"}
              >
                🚻
              </text>
              {t.label ? (
                <text
                  x={t.position[0] + 2.2}
                  y={t.position[1]}
                  fontSize={1.8}
                  fill="#0f172a"
                  dominantBaseline="middle"
                >
                  {t.label}
                </text>
              ) : null}
            </g>
          ))}
        </g>

        {/* Exits: if explicit positions exist, use them; else fallback to evenly spaced dots */}
        {exitsList.length > 0
          ? exitsList.map((e) => (
              <g key={e.id}>
                <circle cx={e.position[0]} cy={e.position[1]} r={1.0} fill="#111827" />
              </g>
            ))
          : Array.from({ length: plan?.exits ?? 0 }, (_, i) => {
              const ang = (i * 360) / Math.max(1, plan.exits || 1);
              const th = (ang * Math.PI) / 180;
              const rMark = R + 0.9;
              const x = cx + rMark * Math.cos(th);
              const y = cy + rMark * Math.sin(th);
              return <circle key={`exit-${i}`} cx={x} cy={y} r={0.9} fill="#111827" />;
            })}
      </svg>

      {/* Center readout */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[48%] text-center pointer-events-none"
        aria-live="polite"
      >
        {centerZone ? (
          <div className="px-5 py-4 rounded-xl shadow-xl bg-white/90 backdrop-blur">
            <div className="text-xl text-gray-900 mb-1 tracking-wide">
              {centerZone.name || `L${centerZone.layer} · S${centerZone.section}`}
            </div>
            <div className="text-sm text-gray-700">
              Congestion:{" "}
              <span className="font-semibold" style={{ color: centerZone.congestion >= 67 ? "#DA5C53" : centerZone.congestion >= 34 ? "#4AA3BA" : "#A8E4B1" }}>
                {Math.round(centerZone.congestion)}%
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};


/* =======================
   Live Page
   ======================= */
const OngoingEvent: React.FC = () => {
  const { currentEvent, simulationResult, isLoading } = useEventStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { eventId: paramId } = useParams();
  const [searchParams] = useSearchParams();
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Resolve eventId (fallback)
  const eventId =
    paramId ?? searchParams.get("eventId") ?? location.state?.eventId ?? currentEvent?.id ?? "demo";

  // Pull plan JSON from your event (string or object). Falls back to embedded sample.
  const plan: StadiumMapJSON = useMemo(() => {
    const raw =
      (currentEvent as any)?.floorplanJson ??
      (currentEvent as any)?.mapJson ??
      (currentEvent as any)?.layoutJson ??
      (currentEvent as any)?.stadiumMap ??
      (currentEvent as any)?.plan ??
      FALLBACK_PLAN;
    try {
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      return FALLBACK_PLAN;
    }
  }, [currentEvent]);

  // Build zones for SVG from the plan (merge live congestion by id if available)
  const zones: FloorZonePolygon[] = useMemo(() => {
    const apiZones = (simulationResult as any)?.zones as FloorZonePolygon[] | undefined;
    if (apiZones?.length) return apiZones;

    if (plan?.zones?.length) {
      const liveById: Record<string, number> = {};
      (simulationResult as any)?.zones?.forEach?.((z: any) => (liveById[z.id] = z.congestion));
      const sectionIdx: Record<number, number> = {};
      return plan.zones.map((z, index) => {
        const prev = sectionIdx[z.layer] ?? 0;
        const next = prev + 1;
        sectionIdx[z.layer] = next;
        
        // Generate mock real-time congestion data with some patterns
        let mockCongestion;
        if (Number.isFinite(liveById[z.id])) {
          mockCongestion = Math.max(0, Math.min(100, liveById[z.id]));
        } else {
          // Create more realistic mock data with some zones being busier
          const basePattern = index % 3 === 0 ? 70 : index % 3 === 1 ? 45 : 25;
          const randomVariation = (Math.random() - 0.5) * 30;
          const timeInfluence = Math.sin((refreshCounter + index) * 0.3) * 15;
          mockCongestion = Math.max(0, Math.min(100, basePattern + randomVariation + timeInfluence));
        }
        
        return {
          id: z.id,
          name: z.name,
          layer: z.layer,
          section: next,
          points: z.points,
          congestion: mockCongestion,
        };
      });
    }
    return [];
  }, [plan, simulationResult, refreshCounter]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshCounter(prev => prev + 1);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Manual refresh function
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
    setRefreshCounter(prev => prev + 1);
    setIsRefreshing(false);
  };

  const avgCongestion = useMemo(
    () => (zones.length ? Math.round(zones.reduce((s, z) => s + z.congestion, 0) / zones.length) : 0),
    [zones]
  );
  const maxZone = useMemo(
    () => (zones.length ? zones.reduce((p, z) => (z.congestion > p.congestion ? z : p), zones[0]) : null),
    [zones]
  );

  const activeEvent: any = currentEvent ?? { name: "Event", capacity: 0, date: new Date().toISOString(), venue: "" };
  const eventDate = activeEvent?.date ? new Date(activeEvent.date) : null;

  if (isLoading && !simulationResult && !plan) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <Spinner size="lg" className="mb-6" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Loading live event…</h2>
          <p className="text-gray-600">Preparing live congestion view.</p>
        </div>
      </div>
    );
  }

  if (!eventId) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-16 w-16 text-amber-500 mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">No event selected</h2>
          <p className="text-gray-600 mb-6">Open an event first, or pass an eventId via URL/query/state.</p>
          <div className="space-x-3">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
            <Button onClick={() => navigate("/new-event")}>Create New Event</Button>
          </div>
        </div>
      </div>
    );
  }

  const headerExits = plan?.exitsList?.length ?? plan?.exits ?? 0;
  const headerLayers = plan?.layers ?? 0;
  const headerSections = plan?.zones?.length ?? 0;
  const headerToilets = plan?.toiletsList?.length ?? 0;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{activeEvent?.name || "On-going Event"}</h1>
          <p className="mt-2 text-gray-600 flex items-center gap-2">
            <Activity className="h-4 w-4 text-green-600" /> Live congestion monitoring
            <span className="text-xs text-gray-500">• Auto-refresh every 10s</span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">Event in progress</span>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card padding="sm" className="bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-600">{zones.length || "—"}</div>
            <div className="text-sm text-gray-600">Active Zones</div>
          </div>
        </Card>
        <Card padding="sm" className="bg-gradient-to-br from-cyan-50 to-cyan-100">
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: COLORS.blue }}>{avgCongestion}%</div>
            <div className="text-sm text-gray-600">Avg Congestion</div>
          </div>
        </Card>
        <Card padding="sm" className="bg-gradient-to-br from-rose-50 to-rose-100">
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: COLORS.red }}>{maxZone ? maxZone.congestion : 0}%</div>
            <div className="text-sm text-gray-600">{maxZone ? `Peak Zone (${maxZone.name})` : "Peak Zone"}</div>
          </div>
        </Card>
        <Card padding="sm" className="bg-gradient-to-br from-emerald-50 to-emerald-100">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {(eventDate ?? new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="text-sm text-gray-600">Local Time</div>
          </div>
        </Card>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Floor plan */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-gradient-to-b from-white to-gray-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Map className="h-4 w-4 text-gray-700" />
                <h2 className="text-xl font-semibold text-gray-900">Venue Floor Plan (SVG)</h2>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <span className="flex items-center gap-1"><DoorOpen className="h-3 w-3" /> {headerExits} exits</span>
                <span>{headerToilets} toilets</span>
                <span>{headerLayers} layers</span>
                <span>{headerSections} sections</span>
              </div>
            </div>
            <StadiumPlanSVG plan={plan} zones={zones} />
          </Card>

          {/* Watchlist */}
          <Card className="bg-gradient-to-b from-white to-gray-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Congestion Watchlist</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {zones.slice().sort((a, b) => b.congestion - a.congestion).map((z) => (
                <div key={z.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div>
                    <p className="font-medium text-gray-900">{z.name}</p>
                    <p className="text-xs text-gray-600">L{z.layer} · S{z.section}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-12 rounded-full" style={{ background: bandedColor(z.congestion) }} />
                    <span className="text-sm font-semibold" style={{ color: bandedColor(z.congestion) }}>
                      {Math.round(z.congestion)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-b from-white to-blue-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Info</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex justify-between"><span className="text-gray-600">Event:</span> <span className="font-medium">{activeEvent?.name || "—"}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Venue:</span> <span className="font-medium">{activeEvent?.venue || activeEvent?.venueLocation?.name || "—"}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Start:</span> <span className="font-medium">{activeEvent?.dateStart ? new Date(activeEvent.dateStart).toLocaleString() : "—"}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">End:</span> <span className="font-medium">{activeEvent?.dateEnd ? new Date(activeEvent.dateEnd).toLocaleString() : "—"}</span></div>
            </div>
          </Card>

          <Card className="bg-gradient-to-b from-white to-red-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Alerts & Suggestions</h3>
            {zones.some((z) => z.congestion >= 80) ? (
              <div className="space-y-4">
                {zones.filter((z) => z.congestion >= 80).map((z) => {
                  // Generate specific suggestions based on zone characteristics
                  const suggestions = [
                    z.layer === 1 
                      ? "Direct crowd to upper level sections" 
                      : "Consider opening additional exits on this level",
                    z.congestion > 90 
                      ? "Deploy crowd control staff immediately" 
                      : "Monitor closely and prepare intervention",
                    z.name.includes("Section 1") || z.name.includes("Section 2")
                      ? "Redirect entry flow to sections 3-4"
                      : "Use alternate entry points",
                    "Increase security presence",
                    "Activate overflow areas if available"
                  ];
                  
                  const prioritySuggestions = suggestions.slice(0, 3);
                  
                  return (
                    <div key={z.id} className="rounded-lg border border-red-200 bg-red-50 p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-red-700">
                              Critical: {z.name} ({Math.round(z.congestion)}% capacity)
                            </p>
                            <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded-full font-medium">
                              HIGH PRIORITY
                            </span>
                          </div>
                          
                          <div className="mb-3">
                            <p className="text-xs text-red-600 font-medium mb-2">💡 Recommended Actions:</p>
                            <ul className="space-y-1">
                              {prioritySuggestions.map((suggestion, index) => (
                                <li key={index} className="text-xs text-red-700 flex items-start gap-2">
                                  <span className="text-red-500 font-bold">•</span>
                                  <span>{suggestion}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-red-600">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                              Layer {z.layer}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                              Section {z.section}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                              {z.congestion > 95 ? "CRITICAL" : z.congestion > 85 ? "URGENT" : "MONITOR"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Overall suggestions when multiple zones are congested */}
                {zones.filter((z) => z.congestion >= 80).length > 1 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-700 mb-2">
                          Multiple High-Congestion Areas Detected
                        </p>
                        <p className="text-xs text-amber-600 font-medium mb-2">🎯 Event-Wide Recommendations:</p>
                        <ul className="space-y-1 text-xs text-amber-700">
                          <li className="flex items-start gap-2">
                            <span className="text-amber-500 font-bold">•</span>
                            <span>Consider temporary event pause for crowd redistribution</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-amber-500 font-bold">•</span>
                            <span>Activate all available exits and emergency protocols</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-amber-500 font-bold">•</span>
                            <span>Deploy additional security and medical teams</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-amber-500 font-bold">•</span>
                            <span>Notify venue management and emergency services</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-700 mb-3">
                  <CheckCircle2 className="h-5 w-5" /> 
                  <span className="font-medium">No high-congestion alerts</span>
                </div>
                
                {/* Show preventive suggestions even when no alerts */}
                <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                  <p className="text-sm font-medium text-green-700 mb-2">✅ Preventive Measures</p>
                  <ul className="space-y-1 text-xs text-green-600">
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 font-bold">•</span>
                      <span>Continue monitoring all zones regularly</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 font-bold">•</span>
                      <span>Maintain clear pathways and exit routes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 font-bold">•</span>
                      <span>Keep emergency teams on standby</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OngoingEvent;
