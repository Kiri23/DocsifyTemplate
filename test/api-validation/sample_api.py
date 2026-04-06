"""Sample Flask API — realistic enough to test AST extraction."""

from flask import Flask, request, jsonify
from typing import Optional

app = Flask(__name__)


@app.route('/api/users', methods=['GET'])
def list_users():
    """List all users with optional filtering."""
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)
    role = request.args.get('role', type=str)
    return jsonify({"users": [], "total": 0})


@app.route('/api/users', methods=['POST'])
def create_user():
    """Create a new user account."""
    data = request.get_json()
    email = data['email']
    name = data['name']
    role = data.get('role', 'viewer')
    return jsonify({"id": 1, "email": email}), 201


@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user(user_id: int):
    """Get a single user by ID."""
    return jsonify({"id": user_id, "email": "test@example.com"})


@app.route('/api/users/<int:user_id>', methods=['PUT'])
def update_user(user_id: int):
    """Update user details."""
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    role = data.get('role')
    return jsonify({"id": user_id, "updated": True})


@app.route('/api/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id: int):
    """Delete a user."""
    return '', 204


@app.route('/api/projects', methods=['GET'])
def list_projects():
    """List projects, optionally filtered by status."""
    status = request.args.get('status', type=str)
    owner_id = request.args.get('owner_id', type=int)
    return jsonify({"projects": []})


@app.route('/api/projects', methods=['POST'])
def create_project():
    """Create a new project."""
    data = request.get_json()
    title = data['title']
    description = data.get('description', '')
    owner_id = data['owner_id']
    tags = data.get('tags', [])
    return jsonify({"id": 1, "title": title}), 201


@app.route('/api/projects/<int:project_id>/members', methods=['POST'])
def add_member(project_id: int):
    """Add a member to a project."""
    data = request.get_json()
    user_id = data['user_id']
    role = data.get('role', 'contributor')
    return jsonify({"added": True}), 201


@app.route('/api/settings', methods=['PUT'])
def update_settings():
    """Update app settings. Uses request.json instead of get_json()."""
    body = request.json
    theme = body.get('theme', 'light')
    notifications = body['notifications']
    return jsonify({"updated": True})


@app.route('/api/search', methods=['GET'])
def search():
    """Search across resources. Has a random dict that should NOT be extracted."""
    q = request.args.get('q', type=str)
    config = {'default_limit': 50}  # NOT a request param
    limit = config.get('default_limit')  # should NOT appear as a param
    return jsonify({"results": []})


if __name__ == '__main__':
    app.run(debug=True)
