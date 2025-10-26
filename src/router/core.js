export class MenuPath {
  constructor(title, icon, route, alias = null, allowedRoles = null) {
    this.title = title
    this.icon = icon
    this.route = route
    this.alias = alias || title.replace(" ", "_").toLowerCase()
    this.allowedRoles = allowedRoles // Array of roles that can access this menu item
  }
}
