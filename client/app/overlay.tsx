import { h, Component, createRef } from 'preact';
import "./overlay.css";

const spinner = <div class="load-spinner"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>;

type Props = {};
type State = { loading: boolean, error: string | null };
export default class OverlayContainer extends Component<Props, State> {
    state: State = {
        loading: true,
        error: null
    };

    render() {
        return (
            <div class="overlay" tabIndex={-1}>
                <div class="center-container">
                    {(this.state.error !== null)
                        ? <span class="error">{this.state.error}</span>
                        : (this.state.loading) ? spinner : ""
                    }
                </div>
            </div>
        )
    }

    get loading(): boolean {
        return this.state.loading;
    }
    set loading(value: boolean) {
        this.state.loading = value;
        this.forceUpdate();
    }

    get error(): string | null {
        return this.state.error;
    }
    set error(value: string | null) {
        this.state.error = value;
        this.forceUpdate();
    }
}