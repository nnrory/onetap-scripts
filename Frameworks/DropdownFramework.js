var binlib = {};

// Helper Function
function dictLength(dict) {
	var count = 0;
	for (_ in dict) {
		count++;
	}
	return count;
}

/**
  * @param {string} name - The name displayed within the menu.
  * @param {string[]} values - The options that will be shown in the dropdown.
  * @param {boolean} multi - Allows you to have multiple selected options.
  * @return {void}
**/
function createDropdown(name, values, multi) {
	UI[multi ? "AddMultiDropdown" : "AddDropdown"](name, values);
	
	binlib[name] = {"multi": multi, "values": {}};

	multi && values.reverse();

	var i = 0; for (value in values) {
		var index = multi ? (1 << (values.length-(i+1))) : i;
		binlib[name].values[index] = values[value];
		i++;
	}
}

/**
  * @param {(string|undefined)} name - Fetches the selected option(s) of a specified dropdown, if undefined it will return all saved dropdowns' selected item(s).
  * @return {(Array|Dictionary[])} - If name is undefined the format is {Dropdown1: ["Slecected1", "Selected2"], Dropdown2: ["Slecected1", "Selected2"]}, else it will return a single array of selected items.
**/
function fetchDropdown(name) {
	var selection = (name ? [] : {})
	var bin = UI.GetValue("Misc", name);

	!name && function() {for (dropdown in binlib) selection[dropdown] = fetchDropdown(dropdown) }();

	if (name) {
		!binlib[name].multi && bin == 0 && selection.push(binlib[name].values[0]) && function() { return selection; }();
		for (var i = dictLength(binlib[name].values)-1; i >= 0; i--) {
			if (!binlib[name].multi && i == 0) continue;

			var index = binlib[name].multi ? (1 << i) : i;
			if (bin-index >= 0) {
				bin -= (index);
				selection.push(binlib[name].values[index]);
			}
		}
	}

	return selection;
}

////////////////////// EXAMPLE //////////////////////
function example() {
	var foo = fetchDropdown("Foo");
	var bar = fetchDropdown("Bar");

	for (v in foo) Global.Print("Foo >> " + foo[v] + "\n");
	for (v in bar) Global.Print("Bar >> " + bar[v] + "\n");

	Global.Print("-----------------------------------\n");
}

createDropdown("Foo", ["Foo1", "Foo2", "Foo3"], false);
createDropdown("Bar", ["Bar1", "Bar2", "Bar3"], true);

Global.RegisterCallback("Draw", "example");
