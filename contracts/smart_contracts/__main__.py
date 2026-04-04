from __future__ import annotations

import dataclasses
import importlib
import logging
import subprocess
import sys
from collections.abc import Callable
from pathlib import Path
from shutil import rmtree


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)-8s %(message)s")
logger = logging.getLogger(__name__)

ROOT = Path(__file__).parent
ARTIFACTS_DIR = ROOT / "artifacts"
DEPLOYMENT_EXTENSION = "py"


@dataclasses.dataclass
class SmartContract:
    path: Path
    name: str
    deploy: Callable[[], None] | None = None


def _import_contract(folder: Path) -> Path:
    contract_path = folder / "contract.py"
    if contract_path.exists():
        return contract_path
    raise RuntimeError(f"Contract not found in {folder}")


def _import_deploy_if_exists(folder: Path) -> Callable[[], None] | None:
    try:
        module_name = f"{folder.parent.name}.{folder.name}.deploy_config"
        deploy_module = importlib.import_module(module_name)
    except ImportError:
        return None
    return deploy_module.deploy  # type: ignore[no-any-return,attr-defined]


def _has_contract_file(directory: Path) -> bool:
    return (directory / "contract.py").exists()


CONTRACTS: list[SmartContract] = [
    SmartContract(
        path=_import_contract(folder),
        name=folder.name,
        deploy=_import_deploy_if_exists(folder),
    )
    for folder in ROOT.iterdir()
    if folder.is_dir() and _has_contract_file(folder) and not folder.name.startswith("_")
]


def _run(command: list[str]) -> None:
    result = subprocess.run(
        command,
        cwd=ROOT.parent,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    if result.stdout:
        print(result.stdout)
    if result.returncode:
        raise SystemExit(result.returncode)


def _client_output_path(output_dir: Path, contract_name: str) -> Path:
    suffix = "_client" if DEPLOYMENT_EXTENSION == "py" else "Client"
    return output_dir / f"{contract_name}{suffix}.{DEPLOYMENT_EXTENSION}"


def build_contract(contract: SmartContract) -> Path:
    output_dir = ARTIFACTS_DIR / contract.name
    if output_dir.exists():
        rmtree(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    logger.info("Building %s with AlgoKit compile", contract.name)
    _run(
        [
            "algokit",
            "--no-color",
            "compile",
            "python",
            str(contract.path.resolve()),
            f"--out-dir={output_dir}",
            "--output-source-map",
        ]
    )
    return output_dir


def generate_client(contract_name: str | None = None) -> None:
    selected = [
        contract for contract in CONTRACTS if contract_name is None or contract.name == contract_name
    ]
    if not selected:
        raise SystemExit(f"Unknown contract: {contract_name}")

    for contract in selected:
        output_dir = ARTIFACTS_DIR / contract.name
        if not output_dir.exists():
            raise SystemExit(f"Build {contract.name} first; missing {output_dir}")

        logger.info("Generating typed client for %s", contract.name)
        _run(
            [
                "algokit",
                "generate",
                "client",
                str(output_dir),
                "--language",
                "python",
                "--output",
                str(_client_output_path(output_dir, contract.name)),
            ]
        )


def build(contract_name: str | None = None) -> None:
    selected = [
        contract for contract in CONTRACTS if contract_name is None or contract.name == contract_name
    ]
    if not selected:
        raise SystemExit(f"Unknown contract: {contract_name}")
    for contract in selected:
        build_contract(contract)


def deploy(contract_name: str | None = None) -> None:
    selected = [
        contract for contract in CONTRACTS if contract_name is None or contract.name == contract_name
    ]
    if not selected:
        raise SystemExit(f"Unknown contract: {contract_name}")
    for contract in selected:
        if contract.deploy is None:
            logger.info("No deploy_config.py for %s; skipping deploy", contract.name)
            continue
        logger.info("Deploying %s", contract.name)
        contract.deploy()


def main(argv: list[str]) -> None:
    if not argv:
        build()
        return

    action = argv[0]
    contract_name = argv[1] if len(argv) > 1 else None

    if action == "build":
        build(contract_name)
        return
    if action == "generate-client":
        generate_client(contract_name)
        return
    if action == "deploy":
        deploy(contract_name)
        return
    if action == "all":
        build(contract_name)
        deploy(contract_name)
        return

    raise SystemExit(f"Unknown action: {action}")


if __name__ == "__main__":
    main(sys.argv[1:])
