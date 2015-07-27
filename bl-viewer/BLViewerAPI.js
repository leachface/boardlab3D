function BLViewerAPI( cartCallback )
{
    var templatesLib = [];
    templatesLib[ "Shortboard" ] = {name:"Shortboard", center:true, left:true, right:true, selected:true };
    templatesLib[ "Retro" ] = {name:"Retro", center:true, left:true, right:true };
    templatesLib[ "Longboard1" ] = {name:"Longboard 1", center:true };
    templatesLib[ "Longboard2" ] = {name:"Longboard 2", center:true };
    templatesLib[ "Pilot" ] = {name:"Pilot", center:true };
    templatesLib[ "Nub" ] = {name:"Nub", center:true, left:true, right:true };

    console.log( "BLViewerAPI v1.3" );

    if (!Detector.webgl) Detector.addGetWebGLMessage();

    var container, scene, camera, renderer, orbit, pointLight1, pointLight2, currentConfig = null, finObject;
    var currentTemplate, currentSystem, currentFoil, currentMaterial;
    var finDepth = 0;
    var finBase = 0;
    var finRake = 0;
    var finRakePoint = null;
    var matLib = [];

    function animate()
    {
        requestAnimationFrame( animate );
        render();
    }

    function render() {
        // Point light 1
        pointLight1.position.set( camera.position.x, camera.position.y, camera.position.z );
        pointLight1.rotation.set( camera.rotation.x, camera.rotation.y, camera.rotation.z );
        pointLight1.updateMatrix();
        pointLight1.translateX(50);
        pointLight1.translateY(50);
        pointLight1.translateZ(50);

        // Point light 2
        pointLight2.position.set( camera.position.x, camera.position.y, camera.position.z );
        pointLight2.rotation.set( camera.rotation.x, camera.rotation.y, camera.rotation.z );
        pointLight2.updateMatrix();
        pointLight2.translateX(0);
        pointLight2.translateY(-60);
        pointLight2.translateZ(100);

        // Render scene
        renderer.clear();
        renderer.render(scene, camera);
    }

    function setBackground( imageFile )
    {
        if( imageFile != null )
            container.style.backgroundImage = "url(" + imageFile + ")";
        else
            container.style.backgroundImage = "url(UI/gradient.png)";
    }

    function setupObject( importObject ) {
        importObject.traverse(function (object) {
            if (object instanceof THREE.Mesh) {
                console.log( object );
                object.material = matLib[ currentMaterial ];
            }
        });
    }

    function computeProjectedFinArea()
    {
        var finArea = 0;
        for( var faceIdx = 0; faceIdx < finObject.geometry.faces.length; faceIdx++ )
        {
            var v0 = finObject.geometry.vertices[ finObject.geometry.faces[ faceIdx].a ];
            var v1 = finObject.geometry.vertices[ finObject.geometry.faces[ faceIdx].b ];
            var v2 = finObject.geometry.vertices[ finObject.geometry.faces[ faceIdx].c ];
            var e1 = { x:v1.x - v0.x, y:v1.y - v0.y, z:0 };
            var e2 = { x:v2.x - v0.x, y:v2.y - v0.y, z:0 };
            var e3 = new THREE.Vector3();
            e3.x = e1.y*e2.z - e1.z*e2.y;
            e3.y = e1.z*e2.x - e1.x*e2.z;
            e3.z = e1.x*e2.y - e1.y*e2.x;
            var A = 0.5 * Math.sqrt(e3.x*e3.x + e3.y*e3.y + e3.z*e3.z);
            finArea += A / 2;
        }
        document.getElementById("areaINPUT").innerHTML = finArea.toFixed( 2 ) + " square inches";
    }

    function getFinMetrics()
    {
        finObject.geometry.computeBoundingBox();
        var bb = finObject.geometry.boundingBox;

        finObject.geometry.verticesBackup = [];

        var baseMin = 1000;
        var baseMax = -1000;
        var widthMin = 1000;
        var widthMax = -1000;
        for( var vertexIdx = 0; vertexIdx < finObject.geometry.vertices.length; vertexIdx++ )
        {
            var v = finObject.geometry.vertices[ vertexIdx ];
            finObject.geometry.verticesBackup[ vertexIdx ] = v.clone();
            if( v.x > widthMax )
            {
                widthMax = v.x;
                finRakePoint = v.clone();
            }
            if( v.x < widthMin ) widthMin = v.x;
            if( Math.abs( v.y - bb.max.y ) < 0.01 )
            {
                if( v.x > baseMax ) baseMax = v.x;
                if( v.x < baseMin ) baseMin = v.x;
            }
        }

        finDepth = bb.max.y - bb.min.y;
        finBase = (baseMax - baseMin);
        finRake = (widthMax - widthMin) - finBase;

        document.getElementById("depthSLIDER").value = 50;
        document.getElementById("baseSLIDER").value = 50;
        document.getElementById("rakeSLIDER").value = 50;

        document.getElementById("depthINPUT").value = finDepth.toFixed( 2 );
        document.getElementById("baseINPUT").value = finBase.toFixed( 2 );
        document.getElementById("rakeINPUT").value = finRake.toFixed( 2 );

        computeProjectedFinArea();
    }

    function updateFinMetrics()
    {
        finObject.geometry.computeBoundingBox();
        var bb = finObject.geometry.boundingBox;

        var baseMin = 1000;
        var baseMax = -1000;
        var widthMin = 1000;
        var widthMax = -1000;
        for( var vertexIdx = 0; vertexIdx < finObject.geometry.vertices.length; vertexIdx++ )
        {
            var v = finObject.geometry.vertices[ vertexIdx ];
            if( v.x > widthMax ) widthMax = v.x;
            if( v.x < widthMin ) widthMin = v.x;
            if( Math.abs( v.y - bb.max.y ) < 0.01 )
            {
                if( v.x > baseMax ) baseMax = v.x;
                if( v.x < baseMin ) baseMin = v.x;
            }
        }

        var newFinDepth = bb.max.y - bb.min.y;
        var newFinBase = (baseMax - baseMin);
        var newFinRake = (widthMax - widthMin) - newFinBase;

        document.getElementById("depthINPUT").value = newFinDepth.toFixed( 2 );
        document.getElementById("baseINPUT").value = newFinBase.toFixed( 2 );
        document.getElementById("rakeINPUT").value = newFinRake.toFixed( 2 );

        computeProjectedFinArea();
    }

    function computeRakeCoef( y )
    {
        return( 1.0 - (finDepth - Math.abs(y)) / finDepth );
    }

    function setFinShape()
    {
        var depthScale = 1 + (document.getElementById("depthSLIDER").value - 50) / 100;
        var baseScale = 1 + (document.getElementById("baseSLIDER").value - 50) / 100;
        var rakeScale = 1 + (document.getElementById("rakeSLIDER").value - 50) / 50;
        var targetRake = finRake * rakeScale;
        var targetRakeX = finBase * baseScale + targetRake;

        // Compute scaled rake point
        var rakeCoefficient = computeRakeCoef(finRakePoint.y);
        var scaledRakeX = finRakePoint.x * baseScale;
        var rakeOffset = (targetRakeX - scaledRakeX) / rakeCoefficient;

        for( var vertexIdx = 0; vertexIdx < finObject.geometry.vertices.length; vertexIdx++ )
        {
            var vOrigin = finObject.geometry.verticesBackup[vertexIdx];
            var v = finObject.geometry.vertices[vertexIdx];
            // Set depth
            v.y = vOrigin.y * depthScale;
            // Set base
            rakeCoefficient = computeRakeCoef(vOrigin.y);
            v.x = vOrigin.x * baseScale + rakeOffset * rakeCoefficient;
        }
        finObject.geometry.verticesNeedUpdate = true;

        updateFinMetrics();
    }

    function LoadOBJ( modelName, isFin ) {
        // model
        var onProgress = function (xhr) {
            if (xhr.lengthComputable) {
                var percentComplete = xhr.loaded / xhr.total;
            }
        };

        var onError = function (xhr) {
        };

        var loader = new THREE.OBJLoader();
        loader.load('models/' + modelName + '.obj', function (object) {
            currentConfig.add(object);
            object.position.x = -3;
            object.position.y = 2;
            object.updateMatrix();
            setupObject( object );
            if( isFin ) {
                finObject = object.children[ 0 ];
                finObject.geometry = new THREE.Geometry().fromBufferGeometry( finObject.geometry );
                getFinMetrics();
            }
        }, onProgress, onError);
    }

    function loadCurrentConfig()
    {
        // Clear current config
        if( currentConfig )
            scene.remove( currentConfig );

        // Add config group
        currentConfig = new THREE.Group();
        scene.add( currentConfig );

        LoadOBJ( currentTemplate + "_" + currentFoil, true );
        if( currentSystem != "None" )
            LoadOBJ( currentSystem );
    }

    function onWindowResize() {

        camera.aspect = container.offsetWidth / container.offsetHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(container.offsetWidth, container.offsetHeight);
    }

    function updateFoilOptions()
    {
        document.getElementById("foilSELECT").options[ 0 ].disabled = !templatesLib[ currentTemplate].center;
        document.getElementById("foilSELECT").options[ 1 ].disabled = !templatesLib[ currentTemplate].left;
        document.getElementById("foilSELECT").options[ 2 ].disabled = !templatesLib[ currentTemplate].right;
    }

    function createUI()
    {
        var menuArea = document.createElement('div');
        menuArea.className = "menu-area";
        container.appendChild( menuArea );

        // Add template drop list
        var templateDIV = document.createElement('div');
        templateDIV.className = "menu-item";

        var optionsHTML = '<select id="templateSELECT">';
        for( var templateID in templatesLib )
            optionsHTML += '<option value="' + templateID + '"' + (templatesLib[ templateID ].selected ? 'selected' : '') +'>' + templatesLib[ templateID ].name + '</option>';
        optionsHTML += '</select>';
        templateDIV.innerHTML = 'TEMPLATE ' + optionsHTML;
        menuArea.appendChild( templateDIV );
        var templateSELECT = document.getElementById("templateSELECT");
        templateSELECT.onchange = function( sel )
        {
            currentTemplate = this.options[this.selectedIndex].value;
            // Select Center foil
            document.getElementById("foilSELECT").options[ 2 ].selected = false;
            document.getElementById("foilSELECT").options[ 1 ].selected = false;
            document.getElementById("foilSELECT").options[ 0 ].selected = true;
            currentFoil = document.getElementById("foilSELECT").options[ 0].value;
            loadCurrentConfig();
            updateFoilOptions();
        };
        currentTemplate = templateSELECT.options[ templateSELECT.selectedIndex ].value;

        // Add system drop list
        var systemDIV = document.createElement('div');
        systemDIV.className = "menu-item";
        systemDIV.innerHTML = 'SYSTEM ' +
        '<select id="systemSELECT">'+
            '<option value="FCSSystem">FCS</option>' +
            '<option value="FuturesSystem" selected>Futures</option>' +
            '<option value="StandardSystem">Standard</option>' +
            '<option value="None">None (glassed on)</option>' +
        '</select>';
        menuArea.appendChild( systemDIV );
        var systemSELECT = document.getElementById("systemSELECT");
        systemSELECT.onchange = function( sel )
        {
            currentSystem = this.options[this.selectedIndex].value;
            if( currentSystem == "None" )
                document.getElementById("materialSELECT").options[ 2 ].disabled = false;
            else {
                document.getElementById("materialSELECT").options[ 2 ].disabled = true;
                // If "Baltic Birch" material was selected, select default material
                if( document.getElementById("materialSELECT").options[ 2 ].selected )
                {
                    document.getElementById("materialSELECT").options[ 2 ].selected = false;
                    document.getElementById("materialSELECT").options[ 0 ].selected = true;
                    currentMaterial = document.getElementById("materialSELECT").options[ 0 ].value;
                }
            }
            loadCurrentConfig();
        };
        currentSystem = systemSELECT.options[ systemSELECT.selectedIndex ].value;

        // Add foil drop list
        var foilDIV = document.createElement('div');
        foilDIV.className = "menu-item";
        foilDIV.innerHTML = 'FOIL ' +
        '<select id="foilSELECT">'+
        '<option value="Center" selected>Center</option>' +
        '<option value="Left">Left</option>' +
        '<option value="Right">Right</option>' +
        '</select>';
        menuArea.appendChild( foilDIV );

        var foilSELECT = document.getElementById("foilSELECT");
        foilSELECT.onchange = function( sel )
        {
            currentFoil = this.options[this.selectedIndex].value;
            loadCurrentConfig();
        };
        currentFoil = foilSELECT.options[ foilSELECT.selectedIndex ].value;
        updateFoilOptions();

        // Add material drop list
        var materialDIV = document.createElement('div');
        materialDIV.className = "menu-item";
        materialDIV.innerHTML = 'MATERIAL ' +
        '<select id="materialSELECT">'+
        '<option value="G10" selected>G10</option>' +
        '<option value="HDME">HDME</option>' +
        '<option value="BalticBirch" disabled>Baltic Birch</option>' +
        '</select>';
        menuArea.appendChild( materialDIV );

        var materialSELECT = document.getElementById("materialSELECT");
        materialSELECT.onchange = function( sel )
        {
            currentMaterial = this.options[this.selectedIndex].value;
            loadCurrentConfig();
        };
        currentMaterial = materialSELECT.options[ materialSELECT.selectedIndex ].value;

        // Add SIZE settings
        var sizeDIV = document.createElement('div');
        sizeDIV.className = "menu-title";
        sizeDIV.innerHTML = "SIZE";
        menuArea.appendChild( sizeDIV );

        var depthDIV = document.createElement('div');
        depthDIV.className = "menu-item";
        depthDIV.innerHTML = 'DEPTH' +
        '<input id="depthSLIDER" type="range"  min="0" max="100" value="50" class="menu-slider"/>' +
        '<input id="depthINPUT" type="text" class="menu-text" readonly/>';
        menuArea.appendChild( depthDIV );
        document.getElementById("depthSLIDER").oninput = function(e)
        {
            setFinShape();
        };

        var baseDIV = document.createElement('div');
        baseDIV.className = "menu-item";
        baseDIV.innerHTML = 'BASE' +
        '<input id="baseSLIDER" type="range"  min="0" max="100" value="50" class="menu-slider"/>' +
        '<input id="baseINPUT" type="text" class="menu-text" readonly/>';
        menuArea.appendChild( baseDIV );
        document.getElementById("baseSLIDER").oninput = function(e)
        {
            setFinShape();
        };

        var rakeDIV = document.createElement('div');
        rakeDIV.className = "menu-item";
        rakeDIV.innerHTML = 'RAKE' +
        '<input id="rakeSLIDER" type="range"  min="0" max="100" value="50" class="menu-slider"/>' +
        '<input id="rakeINPUT" type="text" class="menu-text" readonly/>';
        menuArea.appendChild( rakeDIV );
        document.getElementById("rakeSLIDER").oninput = function(e)
        {
            setFinShape();
        };

        var areaDIV = document.createElement('div');
        areaDIV.className = "menu-item";
        areaDIV.innerHTML = 'AREA' +
        '<span id="areaINPUT" class="menu-slider"></span>';
        menuArea.appendChild( areaDIV );

        // Add ADD TO CART button
        var footerDIV = document.createElement('div');
        footerDIV.className = "menu-footer";
        menuArea.appendChild( footerDIV );

        var addToCart = document.createElement('button');
        addToCart.type = "button";
        addToCart.innerHTML = "Add to Cart";
        addToCart.onclick = function()
        {
            if( cartCallback ) {
                var stlExporter = new THREE.STLExporter();
                var stl = stlExporter.parse( scene );
                cartCallback( stl );
            }
        }
        footerDIV.appendChild( addToCart );
    }

    function loadCubeMap(name) {
        var r = "textures/" + name + "/";
        var urls = [r + "px.jpg", r + "nx.jpg",
            r + "py.jpg", r + "ny.jpg",
            r + "pz.jpg", r + "nz.jpg"];

        return( THREE.ImageUtils.loadTextureCube(urls) );
    }

    function init() {
        var globalLighting = 0.8;
        scene = new THREE.Scene();

        container = document.getElementById('viewport');
        setBackground( null );

        createUI();

        renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(renderer.domElement);

        var aspect = container.offsetWidth / container.offsetHeight;
        camera = new THREE.PerspectiveCamera( 25, aspect, 0.01, 200 );
        orbit = new THREE.OrbitControls( camera, renderer.domElement );
        orbit.autoRotateSpeed = 1.0;
        orbit.minPolarAngle = Math.PI/10; // radians
        orbit.maxPolarAngle = Math.PI - Math.PI/10; // radians
        orbit.rotateSpeed = 2.0;
        camera.position.z = 20;
        camera.position.x = 0;
        camera.position.y = 0;
        var target = new THREE.Vector3();
        camera.lookAt( target );
        orbit.target = target;
        camera.updateProjectionMatrix();

        var ambient = new THREE.AmbientLight(0x666666);
        scene.add(ambient);
        pointLight1 = new THREE.PointLight(0xFFFFFF, globalLighting*0.7, 0);
        scene.add(pointLight1);
        pointLight2 = new THREE.PointLight(0xFFFFFF, globalLighting*0.5, 0);
        scene.add(pointLight2);

        // Build materials library
        matLib[ "G10" ] = new THREE.MeshPhongMaterial({
            transparent: true,
            opacity: 0.8,
            color: 0x66B798,
            specular: 0x0C0C0C,
            shininess: 10,
            reflectivity: 0.05,
            envMap: loadCubeMap( "monastery-gray" )
        });

        matLib[ "HDME" ] = new THREE.MeshPhongMaterial({
            color: 0xEEEEEE,
            specular: 0x050505,
            shininess: 80,
            reflectivity: 0.4,
            envMap: loadCubeMap( "monastery-gray" )
        });

        matLib[ "BalticBirch" ] = new THREE.MeshPhongMaterial({
            map: THREE.ImageUtils.loadTexture("textures/birchtexture.jpg" ),
            color: 0xAAAAAA,
            specular: 0x0C0C0C,
            shininess: 50,
            reflectivity: 0.3
        });

        loadCurrentConfig();

        window.addEventListener( 'resize', onWindowResize, false );
        onWindowResize();

        orbit.update();
        animate();
    }

    init();
}