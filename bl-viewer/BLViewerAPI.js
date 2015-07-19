function BLViewerAPI( cartCallback )
{
    console.log( "BLViewerAPI v1.0")

    if (!Detector.webgl) Detector.addGetWebGLMessage();

    var container, scene, camera, renderer, orbit, pointLight1, pointLight2;

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

    function setupObject( importObject, isSystem ) {
        var blueMat = new THREE.MeshPhongMaterial({
            color: 0x0086CE,
            specular: 0x0C0C0C,
            shininess: 40,
            reflectivity: 0.8
        });

        var greyMat = new THREE.MeshPhongMaterial({
            color: 0xAAAAAA
        });

        importObject.traverse(function (object) {
            if (object instanceof THREE.Mesh) {
                console.log( object );
                if( isSystem )
                    object.material = greyMat;
                else
                    object.material = blueMat;
            }
        });
    }

    function LoadOBJ( modelName, isSystem ) {
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
            scene.add(object);
            object.position.x = -3;
            object.position.y = 2;
            object.updateMatrix();
            setupObject( object, isSystem );
        }, onProgress, onError);
    }

    function onWindowResize() {

        camera.aspect = container.offsetWidth / container.offsetHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(container.offsetWidth, container.offsetHeight);
    }

    function createUI()
    {
        var menuArea = document.createElement('div');
        menuArea.className = "menu-area";
        container.appendChild( menuArea );

        // Add template drop list
        var templateDIV = document.createElement('div');
        templateDIV.className = "menu-item";
        templateDIV.innerHTML = '' +
            '<select id="templateSELECT">'+
                '<option value="Shortboard" selected>Shortboard</option>' +
                '<option value="Longboard">Longboard</option>' +
                '<option value="Knub">Knub</option>' +
                '<option value="Pilot">Pilot</option>' +
            '</select>';
        menuArea.appendChild( templateDIV );
        document.getElementById("templateSELECT").onchange = function( sel )
        {
            var selectedTemplate = this.options[this.selectedIndex].value;
        }

        // Add system drop list
        var systemDIV = document.createElement('div');
        systemDIV.className = "menu-item";
        systemDIV.innerHTML = '' +
        '<select id="systemSELECT">'+
            '<option value="FCSSystem">FCS</option>' +
            '<option value="FuturesSystem" selected>Futures</option>' +
            '<option value="StandardSystem">Standard</option>' +
            '<option value="None">None (glassed on)”</option>' +
        '</select>';
        menuArea.appendChild( systemDIV );
        document.getElementById("systemSELECT").onchange = function( sel )
        {
            var selectedSystem = this.options[this.selectedIndex].value;
            if( selectedSystem == "None" )
                document.getElementById("materialSELECT").options[ 2 ].disabled = false;
            else {
                document.getElementById("materialSELECT").options[ 2 ].disabled = true;
                // If "Baltic Birch" material was selected, select default material
                if( document.getElementById("materialSELECT").options[ 2 ].selected )
                {
                    document.getElementById("materialSELECT").options[ 2 ].selected = false;
                    document.getElementById("materialSELECT").options[ 0 ].selected = true;
                }
            }
        }

        // Add foil drop list
        var foilDIV = document.createElement('div');
        foilDIV.className = "menu-item";
        foilDIV.innerHTML = '' +
        '<select id="foilSELECT">'+
        '<option value="Center" selected>Center</option>' +
        '<option value="Left">Left</option>' +
        '<option value="Right">Right</option>' +
        '</select>';
        menuArea.appendChild( foilDIV );
        document.getElementById("foilSELECT").onchange = function( sel )
        {
            var selectedFoil = this.options[this.selectedIndex].value;
        }

        // Add material drop list
        var materialDIV = document.createElement('div');
        materialDIV.className = "menu-item";
        materialDIV.innerHTML = '' +
        '<select id="materialSELECT">'+
        '<option value="G10" selected>G10</option>' +
        '<option value="HDME">HDME</option>' +
        '<option value="Baltic Birch" disabled>Baltic Birch</option>' +
        '</select>';
        menuArea.appendChild( materialDIV );
        document.getElementById("materialSELECT").onchange = function( sel )
        {
            var selectedMaterial = this.options[this.selectedIndex].value;
        }

        // Add SIZE settings
        var sizeDIV = document.createElement('div');
        sizeDIV.className = "menu-title";
        sizeDIV.innerHTML = "SIZE";
        menuArea.appendChild( sizeDIV );

        var depthDIV = document.createElement('div');
        depthDIV.className = "menu-item";
        depthDIV.innerHTML = 'DEPTH' +
        '<input type="range"  min="0" max="100" />';
        menuArea.appendChild( depthDIV );

        var rakeDIV = document.createElement('div');
        rakeDIV.className = "menu-item";
        rakeDIV.innerHTML = 'RAKE' +
        '<input type="range"  min="0" max="100" />';
        menuArea.appendChild( rakeDIV );

        var baseDIV = document.createElement('div');
        baseDIV.className = "menu-item";
        baseDIV.innerHTML = 'BASE' +
        '<input type="range"  min="0" max="100" />';
        menuArea.appendChild( baseDIV );

        var areaDIV = document.createElement('div');
        areaDIV.className = "menu-item";
        areaDIV.innerHTML = 'AREA';
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
            if( cartCallback )
                cartCallback();
        }
        footerDIV.appendChild( addToCart );
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
        camera = new THREE.PerspectiveCamera( 25, aspect, 0.01, 50 );
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

        LoadOBJ( "ShortboardCenterFin" );
        LoadOBJ( "FuturesSystem", true );

        window.addEventListener( 'resize', onWindowResize, false );
        onWindowResize();

        orbit.update();
        animate();
    }

    init();
}