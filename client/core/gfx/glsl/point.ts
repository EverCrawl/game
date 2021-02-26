import { Shader } from "../shader";

const vs = `#version 300 es
precision mediump float;
uniform mat4 uVIEW;
uniform mat4 uPROJECTION;
layout(location = 0) in vec2 aPOSITION;
layout(location = 1) in vec3 aCOLOR;
out vec3 vColor;
void main()
{
    vColor = aCOLOR;
    gl_Position = uPROJECTION * uVIEW * vec4(aPOSITION.x, aPOSITION.y, 0.0, 1.0);
    // TODO: variable point size
    gl_PointSize = 10.0;
}`;

const fs = `#version 300 es
#extension GL_OES_standard_derivatives : enable
precision mediump float;
in vec3 vColor;
out vec4 oFragColor;
void main()
{
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float r = dot(cxy, cxy);
    float delta = fwidth(r);
    float alpha = 1.0 - smoothstep(1.0 - delta, 1.0 + delta, r);
    oFragColor = vec4(vColor, alpha);
}`;

export function compile() {
    return new Shader(vs, fs);
}