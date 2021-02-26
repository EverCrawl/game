import { h, Component, createRef } from 'preact';
import "./App.css";

import OverlayContainer from "./overlay";
import { Game } from "client/core/game";

export default class App extends Component {
    overlayRef = createRef<OverlayContainer>();
    canvasRef = createRef<HTMLCanvasElement>();
    game!: Game;

    componentDidMount() {
        if (!this.canvasRef.current) throw new Error(`Something went wrong.`);
        if (!this.overlayRef.current) throw new Error(`Something went wrong.`);

        const game = new Game(this.canvasRef.current, this.overlayRef.current);
        game.run();
    }

    render() {
        return (
            <div>
                <div class="container rows center-items noselect">
                    <canvas ref={this.canvasRef} tabIndex={-1} class="noselect"></canvas>
                </div>
                <OverlayContainer ref={this.overlayRef}></OverlayContainer>
            </div>
        );
    }
}