import { h, Component, createRef } from 'preact';
import "./Overlay.css";

export default class OverlayContainer extends Component {
    state = { text: "" };

    render() {
        return (
            <div class="overlay" tabIndex={-1}>
                <span id="collision">{this.state.text}</span>
            </div>
        )
    }
}