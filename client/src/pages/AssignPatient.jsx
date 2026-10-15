import { Link, useNavigate } from 'react-router-dom';
import AssignProtocolForm from '../components/AssignProtocolForm';

export default function AssignPatient() {
    const navigate = useNavigate();

    async function handleAssigned() {
        navigate('/physician');
    }

    return (
        <div className="px-gutter-mobile md:px-gutter-desktop py-section-gap">
            <div className="max-w-[640px] mx-auto flex flex-col gap-flow-gap">
                <Link to="/physician" className="text-body-md text-primary font-medium">
                    Back to my patients
                </Link>

                <header>
                    <h1 className="text-headline-lg text-ink">Add a patient</h1>
                    <p className="text-body-md text-ink-muted mt-1">
                        Enter the email they registered with, then choose a routine and a start date.
                    </p>
                </header>

                <AssignProtocolForm onAssigned={handleAssigned} />
            </div>
        </div>
    );
}
