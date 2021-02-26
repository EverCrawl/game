import { Shader } from "../shader";

const vs = `#version 300 es
precision mediump float;
uniform mat4 uVIEW;
uniform mat4 uPROJECTION;
layout(location = 0) in vec2 aPOSITION;
layout(location = 1) in vec4 aCOLOR;
out vec4 vColor;
void main()
{
    vColor = aCOLOR;
    gl_Position = uPROJECTION * uVIEW * vec4(aPOSITION, 0.0, 1.0);
}`;

const fs = `#version 300 es
precision mediump float;
in vec4 vColor;
out vec4 oFragColor;
void main()
{
    oFragColor = vColor;
}`;

export function compile() {
    return new Shader(vs, fs);
}