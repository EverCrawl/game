import { Shader } from "../shader";

const vs = `#version 300 es
precision mediump float;

uniform mat4 uVIEW;
uniform mat4 uPROJECTION;
uniform mat3 uMODEL;

layout(location = 0) in vec2 aPOSITION;
layout(location = 1) in vec2 aTEXCOORD;

out vec2 vTEXCOORD;

void main()
{
    //vTEXCOORD = vec2(aTEXCOORD.x, 1.0 - aTEXCOORD.y);
    vTEXCOORD = aTEXCOORD;
    vec3 transformed = uMODEL * vec3(aPOSITION, 1.0);
    gl_Position = uPROJECTION * uVIEW * vec4(transformed.xy, 0.0, 1.0);
}`;

const fs = `#version 300 es
precision mediump float;
precision mediump sampler2DArray;

uniform sampler2DArray uATLAS;
uniform uint uTILE;

in vec2 vTEXCOORD;

out vec4 oFRAG;

void main()
{
    vec3 uvw = vec3(vTEXCOORD.x, vTEXCOORD.y, uTILE);
    oFRAG = texture(uATLAS, uvw);
    //oFRAG = vec4(uvw, 1.0);
}`;

export function compile() {
    return new Shader(vs, fs);
}