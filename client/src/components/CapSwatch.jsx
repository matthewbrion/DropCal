//The coloured cap is how most patients tell their bottles apart, so it sits beside the
//name.  Two tone caps are split down the middle.  Medications with no cap, like ointments
//and tablets, render nothing and the row simply starts at the text.

//written out in full rather than built from a string so Tailwind sees every class name
const capClasses = {
    pink: 'bg-cap-pink',
    red: 'bg-cap-red',
    white: 'bg-cap-white',
    yellow: 'bg-cap-yellow',
    purple: 'bg-cap-purple',
    orange: 'bg-cap-orange',
    teal_green: 'bg-cap-teal_green',
    dark_blue: 'bg-cap-dark_blue',
    tan: 'bg-cap-tan',
};

const capNames = {
    pink: 'Pink',
    red: 'Red',
    white: 'White',
    yellow: 'Yellow',
    purple: 'Purple',
    orange: 'Orange',
    teal_green: 'Teal green',
    dark_blue: 'Dark blue',
    tan: 'Tan',
};

export function capLabel(color, accent) {
    if (!color) {
        return null;
    }
    if (accent) {
        return `${capNames[color]} and ${capNames[accent].toLowerCase()} cap`;
    }
    return `${capNames[color]} cap`;
}

export default function CapSwatch({ color, accent }) {
    if (!capClasses[color]) {
        return null;
    }

    return (
        <span
            //the ring is what keeps a white cap visible on a white card
            className="h-9 w-9 shrink-0 flex overflow-hidden rounded-full border-2 border-border-control"
            role="img"
            aria-label={capLabel(color, accent)}
        >
            <span className={`flex-1 ${capClasses[color]}`} />
            {accent && <span className={`flex-1 ${capClasses[accent]}`} />}
        </span>
    );
}
