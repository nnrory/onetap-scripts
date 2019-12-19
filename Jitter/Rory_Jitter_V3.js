CONFIG = undefined;




/******************************** VARIABLES ********************************/
var local = Entity.GetLocalPlayer();
var dir = 0, cycle = false, spin = 0, lbystate = 0, defaultpitch;
var screen = Render.GetScreenSize();
var x = screen[0]/2, y = screen[1]/2;

/***************************** MISC. FUNCTIONS *****************************/
function insideRegion(point, min, max) {
	return point[0] >= min[0] && point[0] <= max[0] && point[1] >= min[1] && point[1] <= max[1];
}

function overflow(num, min, max) {
    var v = num > max ? min + (num - max - 1) : num < min ? max - (min - num -  1) : num
    if (v > max || v < min) v = overflow(v, min, max);
    return v;
}

function getVel() {
	var vel = Entity.GetProp(local, "CBasePlayer", "m_vecVelocity[0]");
    return Math.sqrt(Math.pow(vel[0], 2) + Math.pow(vel[1], 2));
}

/******************************** MENU CLASS *******************************/
function Menu(x, y, width, height, visible, title) {
	this.setPos(x, y);
	this.width = width;
	this.height = height;
	this.visible = visible;
	this.title = title;
	this.font = undefined;

	this.elements = [];
	this.dragStart = undefined;
}

Menu.prototype.setPos = function(x, y) {
	this.x = x, this.y = y;
}

Menu.prototype.drag = function() {
	var cursor = Input.GetCursorPosition();

	if (!this.dragStart) this.dragStart = [cursor[0]-this.x, cursor[1]-this.y];
	this.setPos(cursor[0]-this.dragStart[0], cursor[1]-this.dragStart[1]);
}

Menu.prototype.draw = function() {
	if (!this.visible) return;

	this.font = Render.AddFont("Courier New", 12, 400);

	if (Global.IsKeyPressed(0x1) && (this.dragStart || insideRegion(Input.GetCursorPosition(), [this.x, this.y], [this.x+this.width, this.y+this.height]))) {
		this.drag();
	} else if (!Global.IsKeyPressed(0x1)) {
		this.dragStart = undefined;
	}

	var current = 1;

	for (var i in this.elements) {
		if (!this.elements[i].visible) continue;

		Render.FilledRect(this.x, this.y + current * this.height, this.width, this.height, [0, 0, 0, 150]);
		this.elements[i].draw(this.x, this.y + current * this.height);
		current++;
	}

	Render.FilledRect(this.x, this.y, this.width, this.height, [0, 0, 0, 150]);
	Render.Rect(this.x, this.y, this.width, this.height, [255, 255, 255, 255]);
	Render.Rect(this.x, this.y, this.width, current * this.height, [255, 255, 255, 255]);
	Render.StringCustom(this.x+5, this.y+this.height/2-Render.TextSizeCustom("!", this.font)[1]/2, 0, this.title, [255, 255, 255, 255], this.font);
}

/******************************* BUTTON CLASS ******************************/
function Button(x, y, width, height, parent, visible, text, func, memory, color, hold) {
	this.x = x;
	this.y = y
	this.width = width;
	this.height = height;
	this.parent = parent;
	this.text = text;
	this.func = func;
	this.memory = memory;
	this.color = color;
	this.hold = hold;

	visible && parent.elements.push(this);
}

Button.prototype.draw = function(x, y) {
	if (!insideRegion(Input.GetCursorPosition(), [x+this.x, y+this.y], [x+this.x+this.width, y+this.y+this.height])) {
		this.pressed = false;
	} else if (Global.IsKeyPressed(0x1) != this.pressed) {
		this.pressed = !this.pressed;
		this.pressed && this.func(this, this.parent);
	} else if (Global.IsKeyPressed(0x1) && this.hold) {
		this.func(this, this.parent);
	}

	Render.FilledRect(x+this.x, y+this.y, this.width, this.height, this.color ? this.color : [0, 0, 0, this.pressed ? 150 : 50]);
	Render.Rect(x+this.x, y+this.y, this.width, this.height, [255, 255, 255, 255]);
	this.text && Render.StringCustom(x+this.x+this.width/2, y+this.y+this.height/2-Render.TextSizeCustom("!", this.parent.font)[1]/2, 1, this.text, [255, 255, 255, 255], this.parent.font);
}

/****************************** CHECKBOX CLASS *****************************/
function Checkbox(x, y, width, height, parent, visible, text, reference, func) {
	this.x = x;
	this.y = y
	this.width = width;
	this.height = height;
	this.parent = parent;
	this.visible = visible;
	this.text = text;
	this.reference = reference;
	this.func = func;
	this.attempt = 0;

	UI.AddCheckbox(reference); UI.SetEnabled(reference, false);
	CONFIG && CONFIG[reference] != undefined && UI.SetValue(reference, CONFIG[reference]);
	this.toggled = UI.GetValue(reference);
	func(this, this.parent);

	this.button = new Button(x, y, width, height, this, false, undefined, function(o, p) {
		p.attempt++;
		p.toggled = !p.toggled;
		UI.SetValue(p.reference, p.toggled);
		p.func(p, p.parent);
	});

	parent.elements.push(this);
}

Checkbox.prototype.draw = function(x, y) {
	this.button.draw(x, y);
	Render.FilledRect(x+3+this.x, y+3+this.y, this.width-6, this.height-6, [255, 255, 255, this.toggled ? 255 : 0]);
	this.text && Render.StringCustom(x+this.text[0], y+this.y+this.height/2-Render.TextSizeCustom("!", this.parent.font)[1]/2, this.text[1], this.text[2], [255, 255, 255, 255], this.parent.font);
}

/****************************** SELECTOR CLASS *****************************/
function Selector(x, y, width, height, parent, visible, text, reference, func, memory) {
	this.x = x;
	this.y = y
	this.width = width;
	this.height = height;
	this.parent = parent;
	this.visible = visible;
	this.text = text;
	this.reference = reference;
	this.func = func;
	this.memory = memory;
	this.attempt = 0;

	UI.AddDropdown(reference, memory.options); UI.SetEnabled(reference, false);
	CONFIG && CONFIG[reference] != undefined && UI.SetValue(reference, CONFIG[reference]);
	this.memory.selected = UI.GetValue(reference);
	func(this, this.parent);

	this.back = new Button(x, y, height, height, this, false, "<", function(o, p) {
		p.attempt++;
		p.memory.selected = overflow(p.memory.selected-1, 0, p.memory.options.length-1);
		UI.SetValue(p.reference, p.memory.selected);
		p.func(p, p.parent);
	});

	this.forward = new Button(x+height+width, y, height, height, this, false, ">", function(o, p) {
		p.attempt++;
		p.memory.selected = overflow(p.memory.selected+1, 0, p.memory.options.length-1);
		UI.SetValue(p.reference, p.memory.selected);
		p.func(p, p.parent);
	});

	parent.elements.push(this);
}

Selector.prototype.draw = function(x, y) {
	this.font = this.parent.font;
	this.back.draw(x+2, y);
	this.forward.draw(x+1, y);
	Render.Rect(x+this.x+this.height+2, y+this.y, this.width, this.height, [255, 255, 255, 255]);
	Render.StringCustom(x+this.x+this.height+2+this.width/2, y+this.y+this.height/2-Render.TextSizeCustom("!", this.parent.font)[1]/2, 1, this.memory.options[this.memory.selected], [255, 255, 255, 255], this.font);
	this.text && Render.StringCustom(x+this.text[0], y+this.y+this.height/2-Render.TextSizeCustom("!", this.parent.font)[1]/2, this.text[1], this.text[2], [255, 255, 255, 255], this.parent.font);
}

/****************************** DROPDOWN CLASS *****************************/
function Dropdown(width, parent, visible, text, reference, func, memory) {
	this.width = width;
	this.parent = parent;
	this.visible = visible;
	this.text = text;
	this.reference = reference;
	this.func = func;
	this.memory = memory;
	this.attempt = 0;

	UI.AddDropdown(reference, memory.options); UI.SetEnabled(reference, false);
	CONFIG && CONFIG[reference] != undefined && UI.SetValue(reference, CONFIG[reference]);
	this.memory.selected = UI.GetValue(reference);
	func(this, this.parent);

	this.memory.open = false;

	this.button = new Button(parent.width-parent.height, 0, parent.height, parent.height, this, false, ">", function(o, p) {
		p.open = !p.open;
		o.text = p.open ? "-" : ">";
	});

	this.memory.buttons = [];
	for (var opt in this.memory.options) {
		this.memory.buttons.push(new Button(parent.width, this.parent.height*opt, this.width, this.parent.height, this, false, this.memory.options[opt], function(o, p) {
			p.attempt++;
			p.memory.selected = p.memory.buttons.indexOf(o);
			UI.SetValue(p.reference, p.memory.selected);
			p.func(p, p.parent);
		}, undefined, this.memory.selected == opt ? [0, 0, 0, 230] : undefined))
	};

	parent.elements.push(this);
}

Dropdown.prototype.draw = function(x, y) {
	this.font = this.parent.font;
	this.button.draw(x, y);
	Render.Rect(x+this.parent.width-this.width-this.parent.height+1, y, this.width, this.parent.height, [255, 255, 255, 255]);
	Render.StringCustom(x+this.parent.width-this.width/2-this.parent.height+1, y+this.parent.height/2-Render.TextSizeCustom("!", this.parent.font)[1]/2, 1, this.memory.options[this.memory.selected], [255, 255, 255, 255], this.font);
	this.text && Render.StringCustom(x+this.text[0], y+this.parent.height/2-Render.TextSizeCustom("!", this.parent.font)[1]/2, this.text[1], this.text[2], [255, 255, 255, 255], this.parent.font);
	
	if (!this.open) return;

	for (b in this.memory.buttons) {
		this.memory.buttons[b].color = b == this.memory.selected ? [0, 0, 0, 200] : undefined;
		this.memory.buttons[b].draw(x, y);
	}
}

/****************************** SLIDER CLASS *******************************/
function Slider(width, parent, visible, text, reference, func, memory) {
	this.width = width;
	this.parent = parent;
	this.visible = visible;
	this.text = text;
	this.reference = reference;
	this.func = func;
	this.memory = memory;
	this.attempt = 0;

	UI.AddSliderInt(reference, memory.min, memory.max); UI.SetEnabled(reference, false);
	CONFIG && CONFIG[reference] != undefined && UI.SetValue(reference, CONFIG[reference]);
	this.memory.val = UI.GetValue(reference);
	func(this, this.parent);

	this.bar = new Button(parent.width-this.width+1, 0, this.width-1, parent.height, this, false, undefined, function(o, p) {
		p.attempt++;
		p.memory.val = Math.round(p.memory.min+(Input.GetCursorPosition()[0]-p.parent.x-o.x)/p.width*(Math.abs(p.memory.min)+Math.abs(p.memory.max)));
		UI.SetValue(p.reference, p.memory.val);
		func(p, p.parent);
	}, undefined, [255, 255, 255, 0], true);

	parent.elements.push(this);
}

Slider.prototype.draw = function(x, y) {
	this.bar.draw(x, y);
	Render.FilledRect(x+this.parent.width-this.width+1, y, ((this.memory.val+(this.memory.min < 0 ? this.memory.max : 0))/(Math.abs(this.memory.min)+Math.abs(this.memory.max)))*this.width, this.parent.height, [255, 255, 255, 25]);
	Render.StringCustom(x+this.parent.width-this.width+this.width/2, y+this.parent.height/2-Render.TextSizeCustom("!", this.parent.font)[1]/2, 1, this.memory.val+"", [255, 255, 255, 255], this.parent.font);
	this.text && Render.StringCustom(x+this.text[0], y+this.parent.height/2-Render.TextSizeCustom("!", this.parent.font)[1]/2, this.text[1], this.text[2], [255, 255, 255, 255], this.parent.font);
}

/******************************** FUNCTIONS ********************************/
function onDraw() {
	if (options[UI.GetValue("menu type")].showArrows.toggled && options[UI.GetValue("menu type")].style.memory.selected != 2) {
		var colors = [[255, 255, 255, 255], [255, 255, 255, 255], [255, 255, 255, 255]];
        if (options[UI.GetValue("menu type")].style.memory.selected == 0) {
            colors[dir] = [250, 161, 255, 255];
        } else {
            if (UI.IsHotkeyActive("Fake angles", "Inverter")) colors[0] = [250, 161, 255, 255];
            else colors[2] = [250, 161, 255, 255];
		}
		
		Render.String(x-50, y-20, 1, "<", colors[0], 4);
        Render.String(x, y+30, 1, options[UI.GetValue("menu type")].style.memory.selected == 0 ? "v" : "", colors[1], 4);
        Render.String(x+50, y-20, 1, ">", colors[2], 4);
	}

	if (UI.IsHotkeyActive("Script Items", "left")) dir = 0;
	else if (UI.IsHotkeyActive("Script Items", "back")) dir = 1;
	else if (UI.IsHotkeyActive("Script Items", "right")) dir = 2;

	if (!UI.IsMenuOpen()) return;
	var selected = UI.GetValue("menu type");

	options.forEach(function(group, index) {
		for (var o in group) group[o].visible = selected == index && (group[o].memory != undefined ? group[o].memory.visiblecon != undefined ? group[o].memory.visiblecon : true : true);
	})

	menu.draw();
}

function aaSuper() {
	var type = UI.GetValue("menu type");

	if (options[1].adjustPitch.toggled && type == 1) {
		if (getVel() > options[1].adjustcon.memory.val) UI.SetValue("Extra", "Pitch", options[1].adjustedPitch.memory.selected);
		else UI.SetValue("Extra", "Pitch", defaultpitch);
	}

	if (Globals.Tickcount()%(type == 0 ? ~~(50/Math.pow(options[0].speed.memory.selected+1, 2)) : options[1].freq.memory.val) != 0) return;
	
	cycle = !cycle;

	var width = type == 0 ? ~~(15*(options[0].width.memory.selected+1)) : options[1].width.memory.val;
	var randomize = type == 0 ? (+options[0].randomize.memory.selected*10 || 0) : options[1].randomize.memory.val;

	[function() {
		var ang = 0;
        if (dir == 0) ang = cycle ? -90 : width-90;
        else if (dir == 1) ang = cycle ? width/2 : -(width/2);
		else if (dir == 2) ang = cycle ? 90 : 90-width;

		UI.SetValue("Yaw offset", overflow(ang + (type == 1 ? options[1].rot.memory.val : 0), -180, 180));
	},
	function() {
		spin += options[1].spin.memory.val;
		if (options[1].spin.memory.val == 0 || type == 0) spin = 0;

		if (UI.IsHotkeyActive("Fake angles", "Inverter"))
			UI.SetValue("Yaw offset", cycle ? overflow(180+spin+(type == 1 ? options[1].rot.memory.val : 0), 0, 180)-180 : overflow(180+spin+(type == 1 ? options[1].rot.memory.val : 0), 0, 180));
		else
			UI.SetValue("Yaw offset", cycle ? 180-overflow(180+spin+(type == 1 ? options[1].rot.memory.val : 0), 0, 180) : -overflow(180+spin+(type == 1 ? options[1].rot.memory.val : 0), 0, 180));
	},
	function() {
		UI.SetValue("Yaw offset", (~~(Math.random() * 360)-180));
	}][options[type].style.memory.selected]();

	UI.SetValue("Yaw offset", overflow(UI.GetValue("Yaw offset")+~~(Math.random() * randomize)-randomize, -180, 180));

	if (type != 1) return;

	if (options[1].offsetJitter.toggled && Globals.Tickcount()%options[1].jitternth.memory.val == 0) {
		var ang = ~~(options[1].jitterwidth.memory.val/2); ang = cycle ? ang : -ang;
		ang+=~~overflow((Math.random() * options[1].jitterrandomize.memory.val)-options[1].jitterrandomize.memory.val, -180, 180);

		UI.SetValue("Jitter offset", ang);
	}

	if (options[1].lbyJitter.toggled && Globals.Tickcount()%options[1].lbynth.memory.val == 0) {
		var exclude = options[1].lbyExclude.memory.selected;
		lbystate = overflow(lbystate+1, 0, 2);
		if (exclude != 0 && lbystate == exclude-1) lbystate = overflow(lbystate+1, 0, 2);

		UI.SetValue("LBY mode", lbystate);
	}
}

function playerHurt() {
	if (options[UI.GetValue("menu type")].autoInvert.toggled && Entity.GetEntityFromUserID(Event.GetInt("userid")) == local) UI.ToggleHotkey("Fake angles", "Inverter");
}

function exportSettings() {
	var final = "{"

	options.forEach(function(group, index) {
		for (var o in group) if (group[o].reference) final += "\""+group[o].reference+"\": "+UI.GetValue(group[o].reference)+", ";
	})

	Cheat.Print("\n"+final.substring(0, final.length-2)+"}");
}

/*********************************** UI ************************************/
UI.AddDropdown("menu type", ["simplified", "advanced"]);
UI.AddHotkey("left");
UI.AddHotkey("back");
UI.AddHotkey("right");

var menu = new Menu(200, 200, 400, 26, true, "rory jitter - v3");

var options = [{}, {}]

options[0].style = new Selector(menu.width-203, 0, 150, 26, menu, true, [3, 0, "jitter style"], "2TN", function(o) {
	if (o.attempt == 0) return;
	options[0].width.memory.visiblecon = options[0].style.memory.selected == 0;
}, {selected: undefined, options: ["constrained", "opposites"]});
options[0].width = new Selector(menu.width-203, 0, 150, 26, menu, true, [3, 0, "jitter width"], "M2w", function() {}, {selected: undefined, options: ["15", "30", "45", "60", "75", "90"], visiblecon: options[0].style.memory.selected == 0});
options[0].speed = new Selector(menu.width-203, 0, 150, 26, menu, true, [3, 0, "jitter speed"], "Yae", function() {}, {selected: undefined, options: ["slow", "average", "fast", "hyper"]});
options[0].randomize = new Selector(menu.width-203, 0, 150, 26, menu, true, [3, 0, "randomize factor"], "P78", function() {}, {selected: undefined, options: ["none", "10", "20", "30", "40", "50"]});
options[0].autoInvert = new Checkbox(0, 0, 26, 26, menu, true, [30, 0, "invert when hurt"], "VSj", function() {});
options[0].showArrows = new Checkbox(0, 0, 26, 26, menu, true, [30, 0, "show arrows"], "tGb", function() {});

options[1].style = new Dropdown(170, menu, true, [3, 0, "jitter style"], "Fp6", function(o) {
	if (o.attempt == 0) return;
	options[1].width.memory.visiblecon = o.memory.selected != 2;
	options[1].randomize.memory.visiblecon = o.memory.selected != 2;
	options[1].spin.memory.visiblecon = o.memory.selected == 1;
	options[1].rot.memory.visiblecon = o.memory.selected != 2;
}, {selected: 0, options: ["constrained", "opposites", "unconstrained"]});
options[1].width = new Slider(196, menu, true, [3, 0, "jitter width"], "5jF", function() {}, {min: 0, max: 90, visiblecon: options[1].style.memory.selected != 2});
options[1].randomize = new Slider(196, menu, true, [3, 0, "randomize factor"], "E3u", function() {}, {min: 0, max: 45, visiblecon: options[1].style.memory.selected != 2});
options[1].spin = new Slider(196, menu, true, [3, 0, "spin speed"], "3xM", function() {}, {min: -30, max: 30, visiblecon: options[1].style.memory.selected == 1});
options[1].rot = new Slider(196, menu, true, [3, 0, "yaw rotation"], "8xh", function() {}, {min: -180, max: 180, visiblecon: options[1].style.memory.selected != 2});
options[1].freq = new Slider(196, menu, true, [3, 0, "cycle frequency"], "kK6", function() {}, {min: 1, max: 100});
options[1].offsetJitter = new Checkbox(0, 0, 26, 26, menu, true, [30, 0, "jitter offset"], "XxD", function(o) {
	if (o.attempt == 0) return;
	options[1].jitterwidth.memory.visiblecon = o.toggled;
	options[1].jitterrandomize.memory.visiblecon = o.toggled;
	options[1].jitternth.memory.visiblecon = o.toggled;
});
options[1].jitterwidth = new Slider(196, menu, true, [3, 0, "jitter width"], "VM2", function() {}, {min: 0, max: 180, visiblecon: options[1].offsetJitter.toggled});
options[1].jitterrandomize = new Slider(196, menu, true, [3, 0, "jitter randomize"], "2ya", function() {}, {min: 0, max: 45, visiblecon: options[1].offsetJitter.toggled});
options[1].jitternth = new Slider(196, menu, true, [3, 0, "offset frequency"], "RG4", function() {}, {min: 1, max: 100, visiblecon: options[1].offsetJitter.toggled});
options[1].lbyJitter = new Checkbox(0, 0, 26, 26, menu, true, [30, 0, "lby jitter"], "EB3", function(o) {
	if (o.attempt == 0) return;
	options[1].lbyExclude.memory.visiblecon = o.toggled;
	options[1].lbynth.memory.visiblecon = o.toggled;
});
options[1].lbyExclude = new Dropdown(170, menu, true, [3, 0, "lby exclude"], "G8C", function() {}, {selected:0, options: ["none", "normal", "opposite", "sway"], visiblecon: options[1].lbyJitter.toggled});
options[1].lbynth = new Slider(196, menu, true, [3, 0, "lby jitter frequency"], "ke2", function() {}, {min: 1, max: 100, visiblecon: options[1].lbyJitter.toggled});
options[1].adjustPitch = new Checkbox(0, 0, 26, 26, menu, true, [30, 0, "adjust pitch"], "xN8", function(o) {
	if (o.attempt == 0) return;
	options[1].adjustcon.memory.visiblecon = o.toggled;
	options[1].adjustedPitch.memory.visiblecon = o.toggled;
});
options[1].adjustcon = new Slider(196, menu, true, [3, 0, "velocity condition"], "au2", function() {}, {min: 5, max: 240, visiblecon: options[1].adjustPitch.toggled});
options[1].adjustedPitch = new Dropdown(170, menu, true, [3, 0, "adjusted pitch"], "9bf", function() {}, {selected: 0, options: ["pitch disabled", "down", "emotion", "zero", "up", "fake up", "fake down"], visiblecon: options[1].adjustPitch.toggled});
options[1].autoInvert = new Checkbox(0, 0, 26, 26, menu, true, [30, 0, "invert when hurt"], "z5T", function(o) {});
options[1].showArrows = new Checkbox(0, 0, 26, 26, menu, true, [30, 0, "show arrows"], "8Hx", function(o) {});
options[1].export = new Button(0, 0, menu.width, menu.height, menu, true, "Export Settings", exportSettings);

defaultpitch = UI.GetValue("Extra", "Pitch");

Cheat.RegisterCallback("Draw", "onDraw");
Cheat.RegisterCallback("CreateMove", "aaSuper");
Cheat.RegisterCallback("player_hurt", "playerHurt");