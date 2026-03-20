Run pytest backend/tests -q
........F.................                                               [100%]
=================================== FAILURES ===================================
_______________ test_health_db_endpoint_is_hidden_in_production ________________

monkeypatch = <_pytest.monkeypatch.MonkeyPatch object at 0x7f61c46ee3d0>

    def test_health_db_endpoint_is_hidden_in_production(monkeypatch) -> None:
        app = _build_app(
            monkeypatch,
            ENV="prod",
            DATABASE_URL=os.environ["DATABASE_URL"],
            JWT_SECRET_KEY="x" * 48,
        )
    
        with TestClient(app) as client:
            response = client.get("/health/db")
    
>       assert response.status_code == 404
E       assert 200 == 404
E        +  where 200 = <Response [200 OK]>.status_code

backend/tests/test_health.py:56: AssertionError
=============================== warnings summary ===============================
../../../../../opt/hostedtoolcache/Python/3.11.15/x64/lib/python3.11/site-packages/passlib/utils/__init__.py:854
  /opt/hostedtoolcache/Python/3.11.15/x64/lib/python3.11/site-packages/passlib/utils/__init__.py:854: DeprecationWarning: 'crypt' is deprecated and slated for removal in Python 3.13
    from crypt import crypt as _crypt

backend/tests/test_auth_service.py::test_register_assigns_registrador_role_even_if_client_cannot_choose_role
  /opt/hostedtoolcache/Python/3.11.15/x64/lib/python3.11/site-packages/passlib/handlers/argon2.py:716: DeprecationWarning: Accessing argon2.__version__ is deprecated and will be removed in a future release. Use importlib.metadata directly to query for argon2-cffi's packaging metadata.
    _argon2_cffi.__version__, max_version)

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
=========================== short test summary info ============================
FAILED backend/tests/test_health.py::test_health_db_endpoint_is_hidden_in_production - assert 200 == 404
 +  where 200 = <Response [200 OK]>.status_code
1 failed, 25 passed, 2 warnings in 2.04s
Error: Process completed with exit code 1.