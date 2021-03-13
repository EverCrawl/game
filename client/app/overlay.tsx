import { h, Component } from 'preact';
import "./overlay.css";

const spinner = <div class="load-spinner"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>;

type Props = {};
type State = {
    loading: boolean,
    error: string | null,
    tooltip: string | null
};
export default class OverlayContainer extends Component<Props, State> {
    state: State = {
        loading: true,
        error: null,
        tooltip: null
    };

    render() {
        let isSpinnerEnabled = this.loading;
        let contents;

        if (this.tooltip !== null) {
            contents = <div class="tooltip">{this.tooltip}</div>;
        }
        if (this.error !== null) {
            contents = <div class="error">{this.error}</div>;
            isSpinnerEnabled = false;
        }
        console.log(this.state);

        return <div class="overlay" tabIndex={-1}>
            <div class="center-container">
                {isSpinnerEnabled ? spinner : ""}
                {contents ?? ""}
            </div>
        </div>
    }

    get loading(): boolean {
        return this.state.loading;
    }
    set loading(value: boolean) {
        this.setState({ loading: value });
    }

    get error(): string | null {
        return this.state.error;
    }
    set error(value: string | null) {
        this.setState({ error: value });
    }

    get tooltip(): string | null {
        return this.state.tooltip;
    }
    set tooltip(value: string | null) {
        this.setState({ tooltip: value });
    }
}