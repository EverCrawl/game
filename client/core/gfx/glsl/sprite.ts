import { Shader } from "../shader";

const vs = `#version 300 es
precision mediump float;
uniform mat4 uVIEW;
uniform mat4 uPROJECTION;
uniform mat3 uMODEL;
uniform vec4 uUV;
layout(location = 0) in vec2 aPOSITION;
layout(location = 1) in vec2 aTEXCOORD;
out vec2 vTEXCOORD;
void main()
{
    vTEXCOORD = aTEXCOORD * uUV.zw + uUV.xy;
    vec3 transformed = uMODEL * vec3(aPOSITION, 1.0);
    gl_Position = uPROJECTION * uVIEW * vec4(transformed.xy, 0.0, 1.0);
}`;

const fs = `#version 300 es
precision mediump float;
uniform sampler2D uTEXTURE;
in vec2 vTEXCOORD;
out vec4 oFRAG;
void main()
{
    oFRAG = texture(uTEXTURE, vTEXCOORD);
}`;

export function compile() {
    return new Shader(vs, fs);
}