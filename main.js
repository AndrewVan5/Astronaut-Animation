var canvas;
var gl;

var program;

var near = 1;
var far = 100;

// Edges of window
var left = -6.0;
var right = 6.0;
var ytop = 6.0;
var bottom = -6.0;

var astronautposition = [0, 0, 0];
var astronautvelocity = [0.2, 0.2, 0.0];

// Jellyfish circular orbit variables
var jellyorbit_radius = 1;  // how far from origin
var jellyorbit_speed = 12;   // degrees per second
var jellyorbit_angle = 0;      // current angle in degrees

var lightPosition2 = vec4(100.0, 100.0, 100.0, 1.0 );
var lightPosition = vec4(0.0, 0.0, 100.0, 1.0 );

var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var materialAmbient = vec4( 1.0, 0.0, 1.0, 1.0 );
var materialDiffuse = vec4( 1.0, 0.8, 0.0, 1.0 );
var materialSpecular = vec4( 0.4, 0.4, 0.4, 1.0 );
var materialShininess = 30.0;

var ambientColor, diffuseColor, specularColor;

var modelMatrix, viewMatrix, modelViewMatrix, projectionMatrix, normalMatrix;
var modelViewMatrixLoc, projectionMatrixLoc, normalMatrixLoc;
var eye;
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

var RX = 0;
var RY = 0;
var RZ = 0;

var MS = []; // The modeling matrix stack
var TIME = 0.0; // Realtime
var dt = 0.0
var prevTime = 0.0;
var resetTimerFlag = true;
var animFlag = false;
var controller;

// These are used to store the current state of objects.
// In animation it is often useful to think of an object as having some DOF
// Then the animation is simply evolving those DOF over time. You could very easily make a higher level object that stores these as Position, Rotation (and also Scale!)
var sphereRotation = [0,0,0];
var spherePosition = [0,1,5];

var cubeRotation = [0,-15,0];
var cubePosition = [0,0,0];

var cylinderRotation = [0,0,0];
var cylinderPosition = [1.1,0,0];

var coneRotation = [0,0,0];
var conePosition = [3,0,0];


// Setting the colour which is needed during illumination of a surface
function setColor(c)
{
    ambientProduct = mult(lightAmbient, c);
    diffuseProduct = mult(lightDiffuse, c);
    specularProduct = mult(lightSpecular, materialSpecular);
    
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "specularProduct"),flatten(specularProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "lightPosition"),flatten(lightPosition) );
    gl.uniform1f( gl.getUniformLocation(program, 
                                        "shininess"),materialShininess );
}

// Initialize star field with random positions and sizes
function initStars() {
    stars = [];
    for (var i = 0; i < 50; i++) {  // chooses 50 stars
        var star = {
            x: Math.random() * (12) - 6,
            y: Math.random() * (12) - 6,
            z: Math.random() * (-30) - 20, // creates stars out of frame
            size: Math.random() * (0.03) + 0.01
        };
        stars.push(star);
}
}

// Update star positions
function updateStars(dt) {
    for (var i = 0; i < stars.length; i++) {
        // Moves stars diagonally up
        stars[i].x += dt;
        stars[i].y += dt;
        
        // Catches star off screen
        if (stars[i].x > 7 || stars[i].y > 7) {
            if (Math.random() < 0.5) { // 50/50 to choose what side to generate on
                // Left edge
                stars[i].x = left - Math.random() * 2;
                stars[i].y = Math.random() * (12) - 6;
            } else {
                // Bottom edge
                stars[i].x = Math.random() * (12) - 6;
                stars[i].y = -6 - Math.random() * 2;
            }
            stars[i].z = Math.random() * (-30) - 20;
            stars[i].size = Math.random() * (0.03) + 0.01;
}
}
}

// Creates stars
function drawStars() {
    setColor(vec4(1.0, 1.0, 1.0, 1.0));
    
    for (var i = 0; i < stars.length; i++) {
        gPush(); // uses stars' random values
        gTranslate(stars[i].x, stars[i].y, stars[i].z);
        gScale(stars[i].size, stars[i].size, stars[i].size);
        drawSphere();
        gPop();
    }
}

window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0, 0, 0, 1.0 );
    
    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    

    setColor(materialDiffuse);
	
	// Initialize some shapes, note that the curved ones are procedural which allows you to parameterize how nice they look
	// Those number will correspond to how many sides are used to "estimate" a curved surface. More = smoother
    Cube.init(program);
    Cylinder.init(20,program);
    Cone.init(20,program);
    Sphere.init(36,program);
    
    // Initialize star field
    initStars();

    // Matrix uniforms
    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    normalMatrixLoc = gl.getUniformLocation( program, "normalMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    
    // Lighting Uniforms
    gl.uniform4fv( gl.getUniformLocation(program, 
       "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "specularProduct"),flatten(specularProduct) );	
    gl.uniform4fv( gl.getUniformLocation(program, 
       "lightPosition"),flatten(lightPosition) );
    gl.uniform1f( gl.getUniformLocation(program, 
       "shininess"),materialShininess );


    document.getElementById("animToggleButton").onclick = function() {
        if( animFlag ) {
            animFlag = false;
        }
        else {
            animFlag = true;
            resetTimerFlag = true;
            window.requestAnimFrame(render);
        }
        console.log(animFlag);
    };

    render(0);
}

// Sets the modelview and normal matrix in the shaders
function setMV() {
    modelViewMatrix = mult(viewMatrix,modelMatrix);
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    normalMatrix = inverseTranspose(modelViewMatrix);
    gl.uniformMatrix4fv(normalMatrixLoc, false, flatten(normalMatrix) );
}

// Sets the projection, modelview and normal matrix in the shaders
function setAllMatrices() {
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix) );
    setMV();   
}

// Draws a 2x2x2 cube center at the origin
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCube() {
    setMV();
    Cube.draw();
}

// Draws a sphere centered at the origin of radius 1.0.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawSphere() {
    setMV();
    Sphere.draw();
}

// Draws a cylinder along z of height 1 centered at the origin
// and radius 0.5.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCylinder() {
    setMV();
    Cylinder.draw();
}

// Draws a cone along z of height 1 centered at the origin
// and base radius 1.0.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCone() {
    setMV();
    Cone.draw();
}

// Post multiples the modelview matrix with a translation matrix
// and replaces the modeling matrix with the result, x, y, and z are the translation amounts for each axis
function gTranslate(x,y,z) {
    modelMatrix = mult(modelMatrix,translate([x,y,z]));
}

// Post multiples the modelview matrix with a rotation matrix
// and replaces the modeling matrix with the result, theta is the rotation amount, x, y, z are the components of an axis vector (angle, axis rotations!)
function gRotate(theta,x,y,z) {
    modelMatrix = mult(modelMatrix,rotate(theta,[x,y,z]));
}

// Post multiples the modelview matrix with a scaling matrix
// and replaces the modeling matrix with the result, x, y, and z are the scale amounts for each axis
function gScale(sx,sy,sz) {
    modelMatrix = mult(modelMatrix,scale(sx,sy,sz));
}

// Pops MS and stores the result as the current modelMatrix
function gPop() {
    modelMatrix = MS.pop();
}

// pushes the current modelViewMatrix in the stack MS
function gPush() {
    MS.push(modelMatrix);
}

// Updates jelly leg bend angles
function jellyAngle(index, time) {
    var bend = 20;   // bend amount (degrees)
    var speed = 0.0008;

    return bend * Math.sin(speed * time - index);
}

// draws a Jelly Limb with specified measurements
function drawJellyLimb()
{
    gPush();
    gTranslate(0, -0.22, 0)
    gScale(0.11, 0.27, 0.11);
    drawSphere();
    gPop();
}


function render(timestamp) {
    
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    eye = vec3(0,0,10);
    MS = []; // Initialize modeling matrix stack
	
	// initialize the modeling matrix to identity
    modelMatrix = mat4();
    
    // set the camera matrix
    viewMatrix = lookAt(eye, at , up);
   
    // set the projection matrix
    projectionMatrix = ortho(left, right, bottom, ytop, near, far);

    
    // set all the matrices
    setAllMatrices();
    
    // Draw stars in the background (before other objects)
    drawStars();
    
	if( animFlag )
    {
		dt = (timestamp - prevTime) / 1000.0;
		prevTime = timestamp;
        
        
        updateStars(dt);        // updates star positions

        var astronautAccel = 0.1        // allows for smooth turns

        // Turns astronaut when he reaches certain horizontal values
        if (astronautposition[0] > 0.5) {
            astronautvelocity[0] -= astronautAccel * dt;
        } else if (astronautposition[0] < -0.25) {
            astronautvelocity[0] += astronautAccel * dt;
        }

        // Turns astronaut when he reaches specified vertical values
        if (astronautposition[1] > 0.5) {
            astronautvelocity[1] -= astronautAccel * dt;
        } else if (astronautposition[1] < -0.25) {
            astronautvelocity[1] += astronautAccel * dt;
        }

        // Updates astronaut's current position
        astronautposition[0] += astronautvelocity[0] * dt;
        astronautposition[1] += astronautvelocity[1] * dt;


        // Updates jellyfish's' circular angle
        jellyorbit_angle += jellyorbit_speed * dt;
        // Doesn't let angle go over 360
        if (jellyorbit_angle >= 360.0) {
            jellyorbit_angle -= 360.0;
        }
	}
	

    gPush();    // Opens jellyfish family

        // Jellyfish orbit animation
        gTranslate(0, 1.8, 0);    // moves coordinate system to correct height
        gRotate(jellyorbit_angle, 0, 1, 0); // rotates jellyfish around y-axis
        gTranslate(jellyorbit_radius, 0, -3); // moves jellyfish away from selected y-axis point
        gRotate(-25, 0, 1, 0);
        
        // Jelly Body
        gPush();
        setColor(vec4(1.0, 0.15, 0.5, 1.0));
        gScale(0.4, 0.82, 0.5);
        drawSphere();
        gPop();

        // Jelly Body Small
        gPush();
        gTranslate(0.5, 0, 0);
        setColor(vec4(1.0, 0.15, 0.5, 1.0));
        gScale(0.3, 0.5, 0.5);
        drawSphere();
        gPop();


        // Main Jelly Limb Middle
    gPush();
        setColor(vec4(1.0, 0.65, 0.1, 1.0));
        gRotate(90, 0, 0, 1);
        gTranslate(0, -0.65, 0);
        drawJellyLimb();

        gTranslate(0, -0.44, 0);    // moves to tip of base limb

        // 1
        gPush();
            gRotate(jellyAngle(1, timestamp), 0, 0, 1);
            drawJellyLimb();

            gTranslate(0, -0.44, 0);    // moves to tip of prior tip

            // 2
            gPush();
                gRotate(jellyAngle(2, timestamp), 0, 0, 1);
                drawJellyLimb();

                
                gTranslate(0, -0.44, 0);    // moves to tip of prior tip

                // 3
                gRotate(jellyAngle(3, timestamp), 0, 0, 1);
                drawJellyLimb();

                gTranslate(0, -0.44, 0);    // moves to tip of prior tip

                    // 4
                    gRotate(jellyAngle(4, timestamp), 0, 0, 1);
                    drawJellyLimb();
    gPop();
    gPop();
    gPop();
            

        // Main Jelly Limb Top
    gPush();
        setColor(vec4(1.0, 0.65, 0.1, 1.0));
        gRotate(90, 0, 0, 1);
        gTranslate(0.45, -0.65, 0);
        drawJellyLimb();

        gTranslate(0, -0.44, 0);    // moves to tip of base limb

        // 1
        gPush();
            gRotate(jellyAngle(1, timestamp), 0, 0, 1);
            drawJellyLimb();

            gTranslate(0, -0.44, 0); // moves to tip of prior tip

            // 2
            gPush();
                gRotate(jellyAngle(2, timestamp), 0, 0, 1);
                drawJellyLimb();

                gTranslate(0, -0.44, 0);    // moves to tip of prior tip

                // 3
                gRotate(jellyAngle(3, timestamp), 0, 0, 1);
                drawJellyLimb();

                gTranslate(0, -0.44, 0);    // moves to tip of prior tip

                    // 4
                    gRotate(jellyAngle(4, timestamp), 0, 0, 1);
                    drawJellyLimb();
    gPop();
    gPop();
    gPop();


            // Main Jelly Limb Bottom
    gPush();
        setColor(vec4(1.0, 0.65, 0.1, 1.0));
        gRotate(90, 0, 0, 1);
        gTranslate(-0.45, -0.65, 0);
        drawJellyLimb();

        gTranslate(0, -0.44, 0);    // moves to tip of base limb

        // 1
        gPush();
            gRotate(jellyAngle(1, timestamp), 0, 0, 1);
            drawJellyLimb();

            gTranslate(0, -0.44, 0);    // moves to tip of prior tip

            // 2
            gPush();
                gRotate(jellyAngle(2, timestamp), 0, 0, 1);
                drawJellyLimb();

                gTranslate(0, -0.44, 0);    // moves to tip of prior tip

                // 3
                gRotate(jellyAngle(3, timestamp), 0, 0, 1);
                drawJellyLimb();

                    gTranslate(0, -0.44, 0);    // moves to tip of prior tip

                // 4
                gRotate(jellyAngle(4, timestamp), 0, 0, 1);
                drawJellyLimb();
    gPop();
    gPop();
    gPop();

    gPop(); // closes jellyfish family





    gPush();    // opens astronaut family

	// Body
    gPush();
    gTranslate(
        cubePosition[0] + astronautposition[0], cubePosition[1] + astronautposition[1], cubePosition[2]); // applies astronaut animation
		gPush();
		{

            // Torso
			setColor(vec4(1.0, 1.0, 1.0, 1.0));
			gRotate(cubeRotation[1], 0, 1, 0);

        gPush();
        gScale(0.48, 0.82, 0.5);
		drawCube();
        gPop();
		}
		

        // Head
        gPush();
        gTranslate(0,1.1,0);
	
		{
		setColor(vec4(1.0, 1.0, 1.0, 1.0));
        gScale(0.37, 0.37, 0.37);
		drawSphere();
		}gPop();  
		

        // Visor
        gPush();
        gTranslate(0.02,1.1,0.4);

    {
        setColor(vec4(1.0, 0.65, 0.0, 1.0));
        gScale(0.35, 0.26, 0.3);
        drawSphere();
    }   gPop();


    // Buttons

        // Right Red
        gPush();
        gTranslate(0.25,-0.5,1);

    {
        setColor(vec4(1.0, 0.0, 0.0, 1.0));
        gScale(0.10, 0.10, 0.10);
        drawSphere();
    }   gPop();


        // Left Red
        gPush();
        gTranslate(-0.12,-0.5,1);

    {
        setColor(vec4(1.0, 0.0, 0.0, 1.0));
        gScale(0.10, 0.10, 0.10);
        drawSphere();
    }   gPop();


        // Right Purple
        gPush();
        gTranslate(0.3,-0.2,1);

    {
        setColor(vec4(0.8, 0.8, 1.0, 1.0));
        gScale(0.10, 0.10, 0.10);
        drawSphere();
    }   gPop()


        // Left Purple
        gPush();
        gTranslate(-0.135,-0.2,1);

    {
        setColor(vec4(0.8, 0.8, 1.0, 1.0));
        gScale(0.10, 0.10, 0.10);
        drawSphere();
    }   gPop()


        // Right Blue
        gPush();
        gTranslate(0.2,0.14,1);

    {
        setColor(vec4(0.05, 0.2, 1.0, 1.0));
        gScale(0.10, 0.10, 0.10);
        drawSphere();
    }   gPop()


        // Left Blue
        gPush();
        gTranslate(-0.08,0.14,1);

    {
        setColor(vec4(0.05, 0.2, 1.0, 1.0));
        gScale(0.10, 0.10, 0.10);
        drawSphere();
    }   gPop()


        // NASA Patch
        gPush();
        gTranslate(-0.2,0.55,0.55);

    {
        setColor(vec4(0.05, 0.2, 1.0, 1.0));
        gScale(0.15, 0.15, 0.15);
        drawSphere();
    }   gPop()


    var armwave_maxbend = 8;            
    var armwave_speed = 0.001;             
    var armwave_angle = armwave_maxbend * Math.cos(armwave_speed * timestamp);

        // Right Arm
        gPush();
        gTranslate(0.84, 0.25, 0.45);

    {
        gRotate(-20.0, 0, 1, 0);
        gRotate(45.0 + armwave_angle, 0, 0, 1);  // animation step
        gTranslate(0, -0.25, 0);
        setColor(vec4(1.0, 1.0, 1.0, 1.0));
        gScale(0.13, 0.5, 0.13);
        drawCube();
    }   gPop()


        // Left Arm
        gPush();
        gTranslate(-1.1, 0.25, -1.5);

    {
        gRotate(-45.0 + armwave_angle, 0, 0, 1);   // animation step
        gRotate(-10.0, 0, 1, 0);
        gRotate(15.0, 1, 0, 0);
        gTranslate(0, -0.25, 0);
        setColor(vec4(1.0, 1.0, 1.0, 1.0));
        gScale(0.13, 0.5, 0.13);
        drawCube();
    }   gPop()


    var thighwave_maxbend = 8;            
    var thighwave_speed = 0.001;             
    var thighwave_angle1 = -thighwave_maxbend * Math.cos(thighwave_speed * timestamp);
    var thighwave_angle2 = thighwave_maxbend * Math.cos(thighwave_speed * timestamp);

    var shinwave_maxbend = 6;            
    var shinwave_speed = 0.001;             
    var shinwave_angle1 = -shinwave_maxbend * Math.cos(shinwave_speed * timestamp);
    var shinwave_angle2 = shinwave_maxbend * Math.cos(shinwave_speed * timestamp);

// Right Thigh
gPush();
    gTranslate(0.2, -1.02, -0.5);

    gRotate(-10.0, 0, 1, 0);
    gRotate(20 + thighwave_angle1, 1, 0, 0); // animation step

        gPush();
        gTranslate(0, -0.25, 0);
        gScale(0.155, 0.5, 0.155);
        drawCube();
        gPop();

    // Right Shin
    gPush();
        gTranslate(0, -0.96, -0.22);

        gRotate(40 + shinwave_angle1, 1, 0, 0);  // animation step
            gPush()
            gTranslate(0, -0.25, 0);
            gScale(0.155, 0.5, 0.155);
            drawCube();
            gPop();

        // Right Foot
        gPush();
            gTranslate(0, -0.8, 0.12);
            gPush();
            gTranslate(0, -0.02, 0);
                gScale(0.155, 0.04, 0.28);
                drawCube();
    gPop();
    gPop(); 
    gPop(); 
    gPop(); 



// Left Thigh
gPush();
    gTranslate(-0.3, -1.0, -0.5);
    gRotate(-10.0, 0, 1, 0);
    gRotate(10 + thighwave_angle2, 1, 0, 0); // animation step

        gPush();
        gTranslate(0, -0.25, 0);
        gScale(0.155, 0.5, 0.155);
        drawCube();
        gPop();

    // Left Shin
    gPush();
        gTranslate(0, -0.9, -0.13);
        gRotate(45 + shinwave_angle2, 1, 0, 0);  // animation step

            gPush();
            gTranslate(0, -0.25, 0);
            gScale(0.155, 0.5, 0.155);
            drawCube();
            gPop();

        // Left Foot
        gPush();
            gTranslate(0, -0.57, 0.12);
            gPush();
                gTranslate(0, -0.25, 0);
                gScale(0.155, 0.04, 0.28);
                drawCube();
    gPop();
    gPop(); 
    gPop(); 
    gPop(); 
	gPop();
	gPop();
gPop();
    
    if( animFlag )
        window.requestAnimFrame(render);

}